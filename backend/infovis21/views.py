import base64
import itertools
import sys
from datetime import datetime
from operator import itemgetter
from pprint import pprint
from typing import Collection, List

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

dim_minmax = ma.get_dim_minmax()

graph_state = list()


def get_collection(type_str):
    type_str = type_str.lower()
    if type_str == "genre":
        return ma.coll_genres
    elif type_str == "artist":
        return ma.coll_artists
    elif type_str == "track":
        return ma.coll_tracks
    else:
        return abort(400, description="invalid node type not: genre, artist, track")


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify(error=str(e)), 404


@app.route("/<version>/dimensions")
@cross_origin()
def _dimensions(version):
    """ Return a list of all dimensions of the dataset """
    return jsonify(
        {
            k: {**v, **dim_minmax.get(k, {})}
            for k, v in ma.dimension_descriptions.items()
        }
    )


@app.route("/<version>/search")
def search(version):
    coll_type = request.args.get("type")
    if coll_type is None or len(coll_type) < 1:
        return abort(400, description="missing type parameter (artist/track/genre)")
    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    if dimx is None or dimy is None:
        return abort(400, description="missing dimension parameters dimx and dimy")

    searchterm = request.args.get("searchterm")
    if searchterm is None or len(searchterm) < 1:
        return abort(404, description="not found")

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
                "dimx": dimx,
                "dimy": dimy,
                "x": f"${dimx}",
                "y": f"${dimy}",
                "name": "$name",
                "size": "$popularity",
                "preview_url": "$preview_url",
                # can be one of Genre, Artist or Track (does this need to be capitalized)
                "type": coll_type.capitalize(),
                "genres": "genres",
                "color": "$genre_color",
                "_id": 0,
            }
        },
    ]

    matches = list(collection.aggregate(pipeline))
    for m in matches:
        m["x"] = mongo_to_vis(dimx, m["x"])
        m["y"] = mongo_to_vis(dimy, m["y"])
    d.update({"matches": matches})
    return jsonify(d)


@app.route("/<version>/labels")
@cross_origin()
def _labels(version):
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


@app.route("/<version>/most_popular")
@cross_origin()
def _most_popular(version):
    """ Return a list of most popular genre|artist|track per year """

    limit = request.args.get("limit")
    year_min = request.args.get("year_min")
    year_max = request.args.get("year_max")
    coll_type = request.args.get("type")
    use_super = request.args.get("use_super", False)
    streamgraph = request.args.get("streamgraph", False)

    if not year_min or not year_max or not coll_type:
        return abort(
            400,
            description="must specify year_min, year_max, and type e.g. /most_popular?year_min=2020&year_max=2020&type=artist&limit=10",
        )

    d = {
        "year_min": int(year_min),
        "year_max": int(year_max),
    }
    pipeline = [
        {
            "$project": {
                "popularity": 1,
                "_id": 0,
                "year": 1,
                "super_genre": 1,
                "genre": 1,
                "name": 1,
                "color": 1,
            }
        },
        {
            "$match": {
                "$and": [{"year": {"$gte": d["year_min"], "$lte": d["year_max"]}},]
            }
        },
        {"$group": {"_id": "$year", "entries": {"$push": "$$ROOT"}}},
        {"$sort": {"popularity": -1}},
    ]

    if limit:
        d["limit"] = int(limit)
        pipeline.append({"$limit": d["limit"]},)
    if coll_type:
        d["type"] = str(coll_type)

    if d["type"] == "genre":
        collection = ma.coll_super_genre_pop if use_super else ma.coll_genre_pop
    elif d["type"] == "artist":
        collection = ma.coll_super_artist_pop if use_super else ma.coll_artist_pop
    elif d["type"] == "track":
        collection = ma.coll_tracks
    else:
        return abort(400, description="invalid node type not: genre, artist, track")

    popular = list(collection.aggregate(pipeline))
    keys = [k["name"] for k in popular[0]["entries"]]
    if streamgraph:
        popular = [
            {**{"year": i["_id"]}, **{k["name"]: k["popularity"] for k in i["entries"]}}
            for i in popular
        ]
    else:
        popular = popular[0]["entries"]

    d.update({"most_popular": popular, "keys": (keys if d["type"] == "genre" else [])})
    return jsonify(d)


@app.route("/<version>/artists")
@cross_origin()
def _artists(version):
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


@app.route("/<version>/genres")
@cross_origin()
def _genres(version):
    """ Return a list of all genres and their popularity for the wordcloud """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {"$project": {"name": "$name", "popularity": "$popularity", "_id": 0}},
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


@app.route("/<version>/years")
@cross_origin()
def _years(version):
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


@app.route("/<version>/select")
@cross_origin()
def _select(version):
    """ Return the node ids that should be highlighted based on a user selection """

    d = {}
    node_id = request.args.get("node")  # either genre/artist/track ID
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
    global graph_state
    if len(graph_state) == 0:
        return abort(
            400,
            description="Graph endpoint needs to be hit before a selection recommendation can be given",
        )

    if not (node_id and dimx and dimy and d["type"]):
        return abort(
            400,
            description="Node ID, type, and the x and y dimensions are required to make a selection, e.g. /select?node=19Lc5SfJJ5O1oaxY0fpwfh&dimx=acousticness&dimy=loudness&type=track",
        )

    collection = get_collection(d["type"])

    project_stage = {"$project": {"id": "$id", "_id": 0,}}
    # include all dimensions/features
    [project_stage["$project"].update({dim: 1}) for dim in ma.dimensions]

    node_ids = node_id.split("|")
    selectable_state = list(set(graph_state) - set(node_ids))
    pipeline = [
        # { '$limit': 10},
        {
            "$match": {"id": {"$in": selectable_state}}
        },  # only recommend nodes that are currently in displayed graph
        project_stage,
    ]

    res = list(collection.aggregate(pipeline))

    selected = list(
        collection.aggregate([{"$match": {"id": {"$in": node_ids}}}, project_stage])
    )
    if len(selected) < 1:
        return abort(404, description=f"node with ID '{node_id}' was not found.")

    # one of the most similar nodes is the node itself, can be excluded using processing/different method if needed
    cos_sim = cosine_similarity(
        np.array([dbutils.create_vector_sim(doc) for doc in res]),
        np.array(
            [np.mean([dbutils.create_vector_sim(doc) for doc in selected], axis=0)]
        ),
    ).squeeze()

    # think this is supposed to be faster, but it isn't (using %timeit) coulds probs be optimized
    # selected_np = np.array([create_vector(selected)],dtype=np.float64).reshape(1, -1)
    # res_cos_func = (lambda a: np.dot(a.reshape(-1, 1), selected_np)/(np.linalg.norm(a.reshape(1, -1))*np.linalg.norm(selected_np)))(np.array(list(map(lambda doc: create_vector(doc), res)), dtype=np.float64))

    # get indices of top n similar nodes
    topk_idx = np.argpartition(cos_sim, -topk)[-topk:]

    # retrieving doc info and actual similarity value
    similar_nodes = [(res[i], cos_sim[i]) for i in topk_idx]
    # dissim_nodes = [
    #     (res[i], cos_sim[i]) for i in np.argpartition(cos_sim, -topk)[:topk]
    # ]
    # print(dissim_nodes)
    # print(selected_vectors)
    # print(min(cos_sim))
    # print(max(cos_sim), flush=True)

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

    zoom_level = int(zoom // (1 / dbutils.N_ZOOM_LEVELS))
    zoom = 1 - zoom

    x_min, y_min = np.clip(np.array([x - zoom / 2, y - zoom / 2]), zoom_min, zoom_max)
    x_max, y_max = np.clip(np.array([x + zoom / 2, y + zoom / 2]), zoom_min, zoom_max)

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
                "id": "$id",
                "x": "$x",
                "y": "$y",
                "name": "$name",
                "preview_url": "$preview_url",
                "color": "$genre_color",
                "artists": "$artists",
                "size": "$popularity",
                "type": typ,
                "subgenres": "$genres",
                "genre": "$genre_super",
                "_id": 0,
            }
        },
    ]

    if limit:
        node_pipeline.append({"$limit": int(limit)})

    link_pipeline = [
        {
            "$match": {
                "$and": [  # Note: use $or when including edges with only one endpoint in te viewport
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
                "id": "$id",
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
    global graph_state
    graph_state = [doc["id"] for doc in nodes]
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

    # strings correspond to names of fields in {genre,artist,track}_api collections
    collection = get_collection(typ)

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
                "dimx": dimx,
                "dimy": dimy,
                "x": f"${dimx}",
                "y": f"${dimy}",
                "name": "$name",
                "size": "$popularity",
                "preview_url": "$preview_url",
                "type": d[
                    "type"
                ].capitalize(),  # can be one of Genre, Artist or Track (does this need to be capitalized)
                "genre": "$genres",
                "labels": "$labels",
                "color": "$genre_color",
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

    if limit:
        pipeline.append({"$sort": {"dist": 1}})  # 1 is ascending, -1 descending

    nodes_sorted = list(collection.aggregate(pipeline, allowDiskUse=True))

    if limit:
        limit = min(
            limit, len(nodes_sorted)
        )  # limit doesn't make sense otherwise and choice call will error out
        indices = list(
            np.random.choice(
                len(nodes_sorted),
                limit - 1,
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
        d["limit"] = limit
    else:
        nodes_keep = nodes_sorted

    global graph_state
    graph_state = [doc["id"] for doc in nodes_keep]
    pipeline = [
        {"$match": {"$expr": {"$in": ["$id", graph_state]}}},
        {"$unwind": "$labels"},
        {
            "$group": {
                "_id": "$labels",
                "members": {"$addToSet": "$id"},
                "nodes": {"$first": "$nodes"},
            }
        },
        {"$project": {"id": "$_id", "members": "$members", "color": "black",}},
        {"$project": {"_id": 0}},
    ]

    links_data = list(collection.aggregate(pipeline, allowDiskUse=True))
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
    # d = jsonify(d)
    return d


@app.route("/<version>/graph")
@cross_origin()
def _graph(version):
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
        limit = int(limit)

    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")
    typ = request.args.get("type")

    if None in [x, y, zoom, dimx, dimy, typ]:
        return abort(
            400,
            description="Please specify x and y coordinates, type, zoom level and x and y dimensions, e.g. /graph?x=0&y=0&zoom=0&dimx=acousticness&dimy=loudness&type=track&limit=200",
        )

    if dimx not in ma.dimensions or dimy not in ma.dimensions or dimx == dimy:
        return abort(
            400,
            description=f"dimensions need to be different and one of {ma.dimensions}",
        )

    impl = graph_impl_2 if version == "v2" else graph_impl_1
    d = impl(x, y, dimx, dimy, zoom=zoom, limit=limit, typ=typ)
    return jsonify(d)
