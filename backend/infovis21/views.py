import base64
import itertools
import sys
from datetime import datetime
from operator import itemgetter
from pprint import pprint

import numpy as np
from flask import abort, jsonify, request
from flask_cors import cross_origin
from sklearn.metrics.pairwise import cosine_similarity

from infovis21.app import app
from infovis21.mongodb import MongoAccess as ma

vis_min, vis_max = (
    0,
    1,
)
zoom_min, zoom_max = (
    0,
    1,
)

dim_minmax = ma.get_dim_minmax()


def get_collection(type_str):
    if type_str == "genre":
        return ma.coll_genres
    elif type_str == "artist":
        return ma.coll_artists
    elif type_str == "track":
        return ma.coll_tracks
    else:
        return abort(400, description="invalid node type not: genre, artist, track",)


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


@app.route("/search")
def search():
    searchterm = request.args.get("searchterm")
    coll_type = request.args.get("type")
    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    collection = get_collection(coll_type)
    d = {}
    if not (searchterm and coll_type and dimx and dimy):
        return abort(
            400,
            description="a searchterm and type are required, e.g. /search?searchterm=Marvin%20Sease&type=artist&dimx=acousticness&dimy=tempo",
        )
    pipeline = [
        {
            "$match": {
                "$expr": {
                    "$regexMatch": {
                        "input": "$name",
                        # "regex": f"/{searchterm}/",
                        "regex": searchterm,
                        "options": "i",  # case insensitive match
                    }
                }
            }
        },
        # {'$match': {'name': searchterm}},
        {
            "$project": {
                "id": "$id",
                # returning nodes in MongoDB space, cannot really perform interpolation in aggregation stage but if needed can be done in coll.update_one() for loop
                dimx: f"${dimx}",
                dimy: f"${dimy}",
                "name": "$name",
                "size": "$popularity",
                "preview_url": "$preview_url",
                # can be one of Genre, Artist or Track (does this need to be capitalized)
                "type": coll_type.capitalize(),
                "genres": "genres",
                "color": "#00000",
                "_id": 0,
            }
        },
    ]

    d.update({"matches": list(collection.aggregate(pipeline))})
    return jsonify(d)


@app.route("/labels")
@cross_origin()
def _labels():
    """ Return a list of all labels and the number of songs and artists in their portfolio """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {
            "$project": {
                "name": "$name",
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
        {"$project": {"name": "$name", "popularity": "$popularity", "_id": 0}},
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
        {"$project": {"name": "$name", "popularity": "$popularity", "_id": 0}},
    ]

    if limit:
        topk = int(limit)
        d["limit"] = topk
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
        val_vis, (vis_min, vis_max), (dim_minmax[dim]["min"], dim_minmax[dim]["max"]),
    )


def mongo_to_vis(dim, val_mongo):
    """ Converts from backend MongoDB space to normalized frontend visualization space """
    return np.interp(
        val_mongo, (dim_minmax[dim]["min"], dim_minmax[dim]["max"]), (vis_min, vis_max),
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

    collection = get_collection(d["type"])

    project_stage = {"$project": {"id": "$id", "_id": 0,}}
    # include all dimensions/features
    [project_stage["$project"].update({dim: 1}) for dim in ma.dimensions]
    pipeline = [
        # { '$limit': 10},
        project_stage,
    ]

    res = list(collection.aggregate(pipeline))
    selected = list(collection.aggregate([{"$match": {"id": node_id}}, project_stage]))
    if len(selected) < 1:
        return abort(404, description=f"node with ID '{node_id}' was not found.")
    selected = selected[0]

    # extract 'vector' that is ordered unlike python dicts
    def create_vector(node):
        return [node[dim] for dim in ma.dimensions]

    # one of the most similar nodes is the node itself, can be excluded using processing/different method if needed
    cos_sim = cosine_similarity(
        np.array([create_vector(doc) for doc in res]),
        np.array([create_vector(selected)]),
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


@app.route("/graph")
@cross_origin()
def _graph():
    """ Return a the graph data for a specific zoom level and postion """
    start = datetime.now()
    d = {}
    _x = request.args.get("x")
    if _x:
        d["x"] = float(_x)
    _y = request.args.get("y")
    if _y:
        d["y"] = float(_y)
    _zoom = request.args.get("zoom")
    if _zoom:
        d["zoom"] = float(_zoom)
    _limit = request.args.get("limit")
    if _limit:
        d["limit"] = int(_limit)

    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    d["type"] = request.args.get("type")

    if None in [_x, _y, _zoom, dimx, dimy, d.get("type")]:
        return abort(
            400,
            description="Please specify x and y coordinates, type, zoom level and x and y dimensions, e.g. /graph?x=0.5&y=0.5&zoom=0&dimx=acousticness&dimy=loudness&type=genre&limit=200",
        )

    if dimx not in ma.dimensions or dimy not in ma.dimensions or dimx == dimy:
        return abort(
            400,
            description=f"dimensions need to be different and one of {ma.dimensions}",
        )

    # this assumes that x and y are normalized to range 0, 1 also called normalized frontend visualization space
    # x_min, x_max = viszoomregion_to_mongo(dimx, d["x"], d["zoom"])
    # y_min, y_max = viszoomregion_to_mongo(dimy, d["y"], d["zoom"])

    # this assumes x and y are in MongoDB space, for scaling and zoom it is easier to normalize to this space
    x_min, x_max = viszoomregion_to_mongo(dimx, mongo_to_vis(dimx, d["x"]), d["zoom"])
    y_min, y_max = viszoomregion_to_mongo(dimy, mongo_to_vis(dimy, d["y"]), d["zoom"])

    # strings correspond to names of fields in {genre,artist,track}_api collections
    collection = get_collection(d["type"])

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
                "id": "$id",
                # returning nodes in MongoDB space, cannot really perform interpolation in aggregation stage but if needed can be done in coll.update_one() for loop
                dimx: f"${dimx}",
                dimy: f"${dimy}",
                "name": "$name",
                "size": "$popularity",
                "preview_url": "$preview_url",
                "type": d[
                    "type"
                ].capitalize(),  # can be one of Genre, Artist or Track (does this need to be capitalized)
                "genre": "$genres",
                "labels": "$labels",
                "color": "#00000",
                "dist": {
                    "$add": [
                        {"$pow": [{"$subtract": [f"${dimx}", d["x"]]}, 2]},
                        {"$pow": [{"$subtract": [f"${dimy}", d["y"]]}, 2]},
                    ]
                },
                "_id": 0,
            }
        },
    ]

    if d["limit"]:
        pipeline.append({"$sort": {"dist": 1}})  # 1 is ascending, -1 descending)

    nodes_sorted = list(collection.aggregate(pipeline))

    if d["limit"]:
        d["limit"] = min(
            d["limit"], len(nodes_sorted)
        )  # limit doesn't make sense otherwise and choice call will error out
        indices = list(
            np.random.choice(
                len(nodes_sorted),
                d["limit"] - 1,
                replace=False,
                p=np.linspace(
                    0,
                    2 / len(nodes_sorted) if len(nodes_sorted) != 0 else 0,
                    len(nodes_sorted),
                ),
            )
        )
        indices.append(
            0
        )  # always add node closest to current position, will have prob 0 in choice so no chance of dups
        nodes_keep = list(itemgetter(*indices)(nodes_sorted))
    else:
        nodes_keep = nodes_sorted

    id_list = [doc["id"] for doc in nodes_keep]
    pipeline = [
        {"$match": {"$expr": {"$in": ["$id", id_list]}}},
        {"$unwind": "$labels"},
        {
            "$group": {
                "_id": "$labels",
                "members": {"$addToSet": "$id"},
                "nodes": {"$first": "$nodes"},
            }
        },
        {
            "$project": {
                "id": "$_id",
                "members": "$members",
                "color": "black",  # needs to be set programmatically
            }
        },
        {"$project": {"_id": 0}},
    ]

    links_data = list(collection.aggregate(pipeline))
    links = []
    for label in links_data:
        for src, dest in itertools.combinations(label["members"], 2):
            links.append(
                {
                    "src": src,
                    "dest": dest,
                    # "name": label["id"],
                }
            )
    for node in nodes_keep:
        del node["labels"]
    d.update({"nodes": nodes_keep, "links": links})

    mid = datetime.now()
    print(f"Before jsonify {mid - start}", flush=True)
    d = jsonify(d)
    end = datetime.now()
    print(len(nodes_keep))
    print(len(links))
    print(f"Size of d {sys.getsizeof(d)}")
    print(f"Took {end - start}", flush=True)
    return d
