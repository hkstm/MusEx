import base64
import itertools

import numpy as np
from flask import abort, jsonify, request
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


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify(error=str(e)), 404


@app.route("/dimensions")
def _dimensions():
    """ Return a list of all dimensions of the dataset """
    return jsonify(ma.dimensions)


@app.route("/labels")
def labels():
    """ Return a list of all labels and the number of songs and artists in their portfolio """
    limit = request.args.get("limit")
    d = {}
    if limit:
        topk = int(limit)
        d["limit"] = topk
        # sort and limit
        pass
        # "labels": [
        #     {"name": "Warner", "num_artists": 1000, "total_songs": 10000},
        #     {"name": "Transgressive", "num_artists": 1000, "total_songs": 10000},
        # ]

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

    d.update({"labels": list(ma.coll_labels.aggregate(pipeline))})
    return jsonify(d)


@app.route("/artists")
def artists():

    d = {}
    pipeline = [
        {"$project": {"text": "$artists", "value": "$popularity", "_id": 0}},
    ]

    most_popular = []
    for element in list(ma.coll_artists.aggregate(pipeline)):
        if element["value"] > 70:
            most_popular.append(element)

    len_artists = len(list(ma.coll_artists.aggregate(pipeline)))
    if len(list(ma.coll_artists.aggregate(pipeline))) > 5:
        len_artists = (
            str(round(len(list(ma.coll_artists.aggregate(pipeline))) / 1000)) + "K"
        )

    d.update(
        {
            "artists": list(ma.coll_artists.aggregate(pipeline)),
            "total_artists": len_artists,
            "popular_artists": most_popular,
        }
    )
    return jsonify(d)


@app.route("/genres")
def genres():
    """ Return a list of all genres and their popularity for the wordcloud """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {"$project": {"text": "$genres", "value": "$popularity", "_id": 0}},
    ]

    if limit:
        topk = int(limit)
        d["limit"] = topk
        # sort the genres and limit
        pipeline.update({"$limit", topk})

    res = list(ma.coll_genres.aggregate(pipeline))
    most_popular = [element for element in res if element["value"] > 60]

    d.update(
        {"genres": res, "total": len(res), "populargenres": most_popular,}
    )
    return jsonify(d)


@app.route("/years")
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
def _select():
    """ Return the node ids that should be highlighted based on a user selection """
    d = {}
    node_id = request.args.get("node")  # either genre/artist name or track ID
    _limit = request.args.get("limit")
    # _zoom = request.args.get("zoom") # don't think zoom makes sense here if we have a way to determine genre/artist/track level
    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    d["type"] = request.args.get("type")

    if node_id:
        # node_id = int(node)
        # d["node"] = node_id
        pass

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
def _graph():
    """ Return a the graph data for a specific zoom level and postion """
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

    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    d["type"] = request.args.get("type")

    if not (_x and _y and _zoom and dimx and dimy and d["type"]):
        return abort(
            400,
            description="Please specify x and y coordinates, type, zoom level and x and y dimensions, e.g. /graph?x=&y=200&zoom=0&dimx=acousticness&dimy=loudness&type=track",
        )

    # this assumes that x and y are normalized to range 0, 1 also called normalized frontend visualization space
    # x_min, x_max = viszoomregion_to_mongo(dimx, d["x"], d["zoom"])
    # y_min, y_max = viszoomregion_to_mongo(dimy, d["y"], d["zoom"])

    # this assumes x and y are in MongoDB space, for scaling and zoom it is easier to normalize to this space
    x_min, x_max = viszoomregion_to_mongo(dimx, mongo_to_vis(dimx, d["x"]), d["zoom"])
    y_min, y_max = viszoomregion_to_mongo(dimy, mongo_to_vis(dimy, d["y"]), d["zoom"])

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
    nodes = list(collection.aggregate(pipeline))
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
    return jsonify(d)
