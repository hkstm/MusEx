import base64
import itertools
from pprint import pprint

import numpy as np
from flask import abort, jsonify, request
from flask_cors import cross_origin
from sklearn.metrics.pairwise import cosine_similarity

from infovis21.app import app
from infovis21.mongodb import MongoAccess as ma
from infovis21.mongodb import utils as dbutils

vis_min, vis_max = (
    0,
    1,
)
zoom_min, zoom_max = (
    0,
    1,
)


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify(error=str(e)), 404


@app.route("/dimensions")
@cross_origin()
def _dimensions():
    """ Return a list of all dimensions of the dataset """
    return jsonify(ma.dimensions)


@app.route("/labels")
@cross_origin()
def _labels():
    """ Return a list of all labels and the number of songs and artists in their portfolio """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {
            "$project": {
                "name": "$_id",
                "total_songs": "$n_tracks",
                "num_artists": "$n_artists",
                "_id": 0,
            }
        },
    ]
    if limit:
        topk = int(limit)
        d["limit"] = topk
        pipeline.append({"$sort": {"total_songs": ma.DESC}})
        pipeline.append({"$limit": topk})

    d.update({"labels": list(ma.coll_labels.aggregate(pipeline))})
    return jsonify(d)


@app.route("/artists")
@cross_origin()
def _artists():
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {"$project": {"name": "$artists", "popularity": "$popularity", "_id": 0}},
    ]

    if limit:
        topk = int(limit)
        d["limit"] = topk
        pipeline.append({"$sort": {"popularity": ma.DESC}})
        pipeline.append({"$limit": topk})

    artists = list(ma.coll_artists.aggregate(pipeline))

    # TODO: pre compute the number of distinct artists
    # str(round(len(list(ma.coll_artists.aggregate(pipeline))) / 1000)) + "K"

    d.update(
        {"artists": artists, "total": len(artists),}
    )
    return jsonify(d)


@app.route("/genres")
@cross_origin()
def _genres():
    """ Return a list of all genres and their popularity for the wordcloud """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {"$project": {"name": "$genres", "popularity": "$popularity", "_id": 0}},
    ]

    if limit:
        topk = int(limit)
        # d["limit"] = topk
        pipeline.append({"$sort": {"popularity": ma.DESC}})
        pipeline.append({"$limit": topk})

    genres = list(ma.coll_genres.aggregate(pipeline))
    d.update(
        {"genres": genres, "total": len(genres),}
    )
    return jsonify(d)


@app.route("/years")
@cross_origin()
def _years():
    """ Return a detailed info of music through different years for heatmap """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {
            "$project": {
                "year": "$year",
                # "key": "$key",
                # "mode": "$mode",
                "popularity": "$popularity",
                "acousticness": "$acousticness",
                "danceability": "$danceability",
                "duration_ms": "$duration_ms",
                "energy": "$energy",
                "instrumentalness": "$instrumentalness",
                "liveness": "$liveness",
                "loudness": "$loudness",
                "speechiness": "$speechiness",
                "tempo": "$tempo",
                "valence": "$valence",
                "_id": 0,
            }
        },
    ]
    if limit:
        topk = int(limit)
        d["limit"] = topk
        pipeline.append({"$sort": {"year": ma.DESC}})
        pipeline.append({"$limit": topk})
    d.update({"data": list(ma.coll_years.aggregate(pipeline))})
    return jsonify(d)


def vis_to_mongo(dim, val_vis):
    """ Converts from normalized frontend visualization space to backend MongoDB space """
    return np.interp(
        val_vis,
        (vis_min, vis_max),
        (ma.dim_minmax[dim]["min"], ma.dim_minmax[dim]["max"]),
    )


def mongo_to_vis(dim, val_mongo):
    """ Converts from backend MongoDB space to normalized frontend visualization space """
    return np.interp(
        val_mongo,
        (ma.dim_minmax[dim]["min"], ma.dim_minmax[dim]["max"]),
        (vis_min, vis_max),
    )


def viszoomregion_to_mongo(
    dim, val, zoom, screen_min=0, screen_max=1, zoom_func=(lambda zoom: zoom)
):
    """ Creates dimension limits in MongoDB space based on normalized frontend visualization """
    zoom_val = 1 - zoom_func(zoom)
    val_zoom_min = val - zoom_val
    val_zoom_max = val + zoom_val
    val_zoom_min, val_zoom_max = np.clip(
        [val_zoom_min, val_zoom_max],
        screen_min,  # screen_min and screen_max would need to be given by the frontend if dealing with aspect ratio's that cut a part of the screen off
        screen_max,
    )
    return vis_to_mongo(dim, val_zoom_min), vis_to_mongo(dim, val_zoom_max)


@app.route("/select")
@cross_origin()
def _select():
    """ Return the node ids that should be highlighted based on a user selection """
    d = {}
    node_id = request.args.get("node")  # either genre/artist name or track ID
    _limit = request.args.get("limit")
    # _zoom = request.args.get("zoom") # don't think zoom makes sense here if we have a way to determine genre/artist/track level
    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    d["type"] = request.args.get("type")

    topk = 6
    if _limit:
        topk = int(_limit)
        d["limit"] = topk

    # zoom = 4
    # if _zoom:
    #     zoom = float(_zoom)
    #     d["zoom"] = zoom

    if not (node_id and dimx and dimy and d["type"]):
        return abort(
            400,
            description="a node ID, type, and the x and y dimensions are required to make a selection, e.g. /select?node=19Lc5SfJJ5O1oaxY0fpwfh&dimx=acousticness&dimy=loudness&type=track",
        )

    mongo_values = ma.map_zoom_to_mongo(d["type"])
    id_val = mongo_values["id_val"]
    collection = mongo_values["collection"]

    project_stage = {"$project": {"id": "$" + id_val, "_id": 0,}}
    # include all dimensions/features
    [project_stage["$project"].update({dim: 1}) for dim in ma.dimensions]
    pipeline = [
        # { '$limit': 10},
        project_stage,
    ]

    res = list(collection.aggregate(pipeline))
    selected = list(
        collection.aggregate([{"$match": {id_val: node_id}}, project_stage])
    )
    if len(selected) < 1:
        return abort(404, description=f"node with ID '{node_id}' was not found.")
    selected = selected[0]

    # one of the most similar nodes is the node itself, can be excluded using processing/different method if needed
    cos_sim = cosine_similarity(
        np.array([dbutils.create_vector(doc) for doc in res]),
        np.array([dbutils.create_vector(selected)]),
    ).squeeze()

    # think this is supposed to be faster, but it isn't (using %timeit) coulds probs be optimized
    # selected_np = np.array([create_vector(selected)],dtype=np.float64).reshape(1, -1)
    # res_cos_func = (lambda a: np.dot(a.reshape(-1, 1), selected_np)/(np.linalg.norm(a.reshape(1, -1))*np.linalg.norm(selected_np)))(np.array(list(map(lambda doc: create_vector(doc), res)), dtype=np.float64))

    # get indices of top n similar nodes
    topk_idx = np.argpartition(cos_sim, -topk)[-topk:]

    # retrieving doc info and actual similarity value
    similar_nodes = [(res[i], cos_sim[i]) for i in topk_idx]

    max_x_i, min_x_i, max_y_i, min_y_i = 0, 0, 0, 0

    # find max and min values for dimensions for regions of interest (not sure if that is what is intended)
    for i in range(1, len(similar_nodes)):
        curr_node = similar_nodes[i][0]
        if curr_node[dimx] > similar_nodes[max_x_i][0][dimx]:
            max_x_i = i
        if curr_node[dimy] > similar_nodes[max_y_i][0][dimy]:
            max_y_i = i
        if curr_node[dimx] < similar_nodes[min_x_i][0][dimx]:
            min_x_i = i
        if curr_node[dimy] < similar_nodes[min_y_i][0][dimy]:
            min_y_i = i

    d.update(
        {
            "nodes": [tpl[0]["id"] for tpl in similar_nodes],
            "regions_of_interest": {
                "dimensions": {
                    "width": (
                        similar_nodes[max_x_i][0][dimx]
                        - similar_nodes[min_x_i][0][dimx]
                    ),
                    "height": (
                        similar_nodes[max_y_i][0][dimy]
                        - similar_nodes[min_y_i][0][dimy]
                    ),
                },
                "interest": [
                    {"x": tpl[0][dimx], "y": tpl[0][dimy], "value": tpl[1],}
                    for tpl in similar_nodes
                ],
            },
        }
    )
    return jsonify(d)


def graph_impl_2(x, y, dimx, dimy, zoom=None, limit=None, typ=None):
    d = {
        "x": x,
        "y": y,
        "dimx": dimx,
        "dimy": dimy,
    }

    if zoom:
        d["zoom"] = zoom
    if limit:
        d["limit"] = limit
    if typ:
        d["type"] = typ
    # zoom_level = len(dbutils.ZOOM_LEVELS) - 2
    zoom_level = int(zoom // (1 / dbutils.N_ZOOM_LEVELS))
    zoom = 1 - zoom

    # zoom_level = 0
    # while (
    #     zoom_level < len(dbutils.ZOOM_LEVELS) - 1
    #     and dbutils.ZOOM_LEVELS[zoom_level + 1] > zoom
    # ):
    #     zoom_level += 1
    # return dict(zoom_level=zoom_level)

    x_min, y_min = np.clip(np.array([x - zoom / 2, y - zoom / 2]), zoom_min, zoom_max)
    x_max, y_max = np.clip(np.array([x + zoom / 2, y + zoom / 2]), zoom_min, zoom_max)

    mongo_values = ma.map_zoom_to_mongo(typ)
    name = mongo_values["name"]
    # x_min, x_max = vis_to_mongo(dimx, val_zoom_min), vis_to_mongo(dim, val_zoom_max)
    # x_min, x_max = viszoomregion_to_mongo(dimx, mongo_to_vis(dimx, x), zoom)
    # y_min, y_max = viszoomregion_to_mongo(dimy, mongo_to_vis(dimy, y), zoom)

    # we want to use only lookups as much as possible
    node_pipeline = [
        {
            "$match": {
                "$and": [
                    {"x": {"$gte": x_min, "$lte": x_max}},
                    {"y": {"$gte": y_min, "$lte": y_max}},
                ]
            }
        },
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "x": "$x",
                "y": "$y",
                # "y": "$y",
                "name": name,
                "size": "$popularity",
                "type": typ,
                # "genre": genre,
                "color": "#00000",
                "_id": 0,
            }
        },
    ]

    if limit:
        node_pipeline.append({"$limit": int(limit)})

    link_pipeline = [
        {
            "$match": {
                "$or": [
                    {
                        "$and": [
                            {"x1": {"$gte": x_min, "$lte": x_max}},
                            {"y1": {"$gte": y_min, "$lte": y_max}},
                        ]
                    },
                    {
                        "$and": [
                            {"x2": {"$gte": x_min, "$lte": x_max}},
                            {"y2": {"$gte": y_min, "$lte": y_max}},
                        ]
                    },
                ]
            }
        },
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "src": "$src",
                "dest": "$dest",
                "x1": "$x1",
                "y1": "$y1",
                "x2": "$x2",
                "y2": "$y2",
                "color": "$color",
                "name": "$name",
                "_id": 0,
            }
        },
    ]

    precomputed_nodes = dbutils.precomputed_nodes_collection(
        dimx, dimy, typ, zoom_level
    )
    precomputed_links = dbutils.precomputed_links_collection(
        dimx, dimy, typ, zoom_level
    )
    nodes = list(precomputed_nodes.aggregate(node_pipeline))
    links = list(precomputed_links.aggregate(link_pipeline))
    d.update(
        {"nodes": nodes, "links": links,}
    )
    # return [node_pipeline, link_pipeline, nodes, links]
    return d


def graph_impl_1(x, y, dimx, dimy, zoom=None, limit=None, typ=None):
    d = {
        "x": x,
        "y": y,
        "dimx": dimx,
        "dimy": dimy,
    }

    if zoom:
        d["zoom"] = zoom
    if limit:
        d["limit"] = limit
    if typ:
        d["type"] = typ

    # this assumes that x and y are normalized to range 0, 1 also called normalized frontend visualization space
    # x_min, x_max = viszoomregion_to_mongo(dimx, d["x"], d["zoom"])
    # y_min, y_max = viszoomregion_to_mongo(dimy, d["y"], d["zoom"])

    # this assumes x and y are in MongoDB space, for scaling and zoom it is easier to normalize to this space
    x_min, x_max = viszoomregion_to_mongo(dimx, mongo_to_vis(dimx, x), zoom)
    y_min, y_max = viszoomregion_to_mongo(dimy, mongo_to_vis(dimy, y), zoom)

    mongo_values = ma.map_zoom_to_mongo(d["type"])
    id_val = mongo_values["id_val"]
    album_label = mongo_values["album_label"]
    name = mongo_values["name"]
    genre = mongo_values["genre"]
    collection = mongo_values["collection"]
    coll_type = mongo_values["coll_type"]

    pipeline = [
        {
            "$match": {
                "$and": [
                    {dimx: {"$gte": x_min, "$lte": x_max}},
                    {dimy: {"$gte": y_min, "$lte": y_max}},
                ]
            }
        },
        {
            "$project": {
                "id": {"$toString": "$_id"},
                dimx: f"${dimx}",  # returning nodes in MongoDB space, cannot really perform interpolation in aggregation stage but if needed can be done in coll.update_one() for loop
                dimy: f"${dimy}",
                "name": name,
                "size": "$popularity",
                "type": coll_type,  # can be one of Genre, Artist or Song
                "genre": genre,
                "color": "#00000",
                "_id": 0,
            }
        },
    ]

    if limit:
        pipeline.append({"$limit": limit})

    nodes = list(collection.aggregate(pipeline))
    node_ids = [n["name"] for n in nodes]
    pipeline = [
        {
            "$match": {
                "$and": [
                    {dimx: {"$gte": x_min, "$lte": x_max}},
                    {dimy: {"$gte": y_min, "$lte": y_max}},
                ]
            }
        },
        {"$unwind": album_label},
        {"$group": {"_id": album_label, "members": {"$addToSet": "$" + id_val},}},
        {
            "$project": {
                "id": "$_id",
                "members": "$members",
                "color": "black",  # needs to be set programmatically
            }
        },
    ]
    links_data = list(collection.aggregate(pipeline))
    links = []
    for label in links_data:
        for src, dest in itertools.combinations(label["members"], 2):
            links.append(
                {
                    "src": src,
                    "dest": dest,
                    "color": label["color"],
                    "name": label["id"],
                }
            )

    d.update(
        {"nodes": nodes, "links": links,}
    )
    return d


@app.route("/graph")
@cross_origin()
def _graph():
    """ Return a the graph data for a specific zoom level and postion """
    x = request.args.get("x")
    if x:
        x = float(x)
    y = request.args.get("y")
    if y:
        y = float(y)
    zoom = request.args.get("zoom")
    if zoom:
        zoom = float(zoom)
    limit = request.args.get("limit")
    if limit:
        limit = float(limit)

    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    typ = request.args.get("type")

    if None in [x, y, zoom, dimx, dimy, typ]:
        return abort(
            400,
            description="Please specify x and y coordinates, type, zoom level and x and y dimensions, e.g. /graph?x=0&y=0&zoom=0&dimx=acousticness&dimy=loudness&type=track",
        )

    if dimx not in ma.dimensions or dimy not in ma.dimensions or dimx == dimy:
        return abort(
            400,
            description=f"dimensions need to be different and one of {ma.dimensions}",
        )

    d = graph_impl_2(x, y, dimx, dimy, zoom=zoom, limit=limit, typ=typ)
    return jsonify(d)
