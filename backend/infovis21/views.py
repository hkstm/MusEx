import base64
import itertools

import numpy as np
from flask import abort, jsonify, request
from sklearn.metrics.pairwise import cosine_similarity

from infovis21.app import app
from infovis21.mongodb import MongoAccess as ma

# I'll factor this and the mongodb related logic out of this file when we have a functional prototype

x_min_abs, x_max_abs = (
    0,
    1000,
)  # Arbitrary, not sure in which space/units these are in the frontend, pixels? If so, we need to handle different screen sizes/resizing at some point
y_min_abs, y_max_abs = 0, 1000

dimensions = [
    "danceability",
    "duration_ms",
    "energy",
    "instrumentalness",
    "liveness",
    "loudness",
    "speechiness",
    "tempo",
    "valence",
    "popularity",
    "key",
    "mode",
    "acousticness",
]

dim_absvals = {
    "acousticness": {"max": 0.996, "min": 0.0},
    "danceability": {"max": 0.988, "min": 0.0},
    "duration_ms": {"max": 5338302, "min": 4937},
    "energy": {"max": 1.0, "min": 0.0},
    "explicit": {"max": 1, "min": 0},
    "instrumentalness": {"max": 1.0, "min": 0.0},
    "key": {"max": 11, "min": 0},
    "liveness": {"max": 1.0, "min": 0.0},
    "loudness": {"max": 3.855, "min": -60.0},
    "mode": {"max": 1, "min": 0},
    "popularity": {"max": 100, "min": 0},
    "speechiness": {"max": 0.971, "min": 0.0},
    "tempo": {"max": 243.507, "min": 0.0},
    "valence": {"max": 1.0, "min": 0.0},
    "year": {"max": 2021, "min": 1920},
}

genre_str = "Genre"
artist_str = "Artist"
track_str = "Track"  # this might be Song in the frontend not Track

zoom_map = {
    1: genre_str,
    2: genre_str,
    3: genre_str,
    4: artist_str,
    5: artist_str,
    6: artist_str,
    7: track_str,
    8: track_str,
    9: track_str,
}


@app.errorhandler(400)
def bad_request(e):
    return jsonify(error=str(e)), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify(error=str(e)), 404


@app.route("/dimensions")
def _dimensions():
    """ Return a list of all dimensions of the dataset """
    return jsonify(dimensions)

 


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
        { '$project': {'name': '$_id', 'total_songs': '$n_tracks', 'num_artists': '$n_artists', '_id' : 0} },
    ]

    d.update(
        {
            "labels": list(ma.coll_labels.aggregate(pipeline))
        }
    )
    return jsonify(d)


@app.route("/artists")

def artists():

	d = {}
	pipeline = [
        { '$project': {'text' : '$artists', 'value' : '$popularity', '_id' : 0} },
    ]
    
	most_popular =[]
	for element in list(ma.coll_artists.aggregate(pipeline)):
		if element["value"] > 70:
			most_popular.append(element)

	len_artists = len(list(ma.coll_artists.aggregate(pipeline)))
	if len(list(ma.coll_artists.aggregate(pipeline))) > 5:
		len_artists = str(round(len(list(ma.coll_artists.aggregate(pipeline)))/1000))+"K"


	d.update(
        {
            "artists": list(ma.coll_artists.aggregate(pipeline)),
        	"total_artists": len_artists,
        	"popular_artists": most_popular
        }
    )
	return jsonify(d)


@app.route("/genres")

def genres():
    """ Return a list of all genres and their popularity for the wordcloud """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        { '$project': {'text' : '$genres', 'value' : '$popularity', '_id' : 0} },
    ]



    if limit:
        topk = int(limit)
        d["limit"] = topk
        # sort the genres and limit
        pipeline.update({'$limit', topk})


    most_popular =[]
    
    for element in list(ma.coll_genres.aggregate(pipeline)):
     	if element["value"] > 60:
     		most_popular.append(element)

    d.update(
        {
            "genres": list(ma.coll_genres.aggregate(pipeline)),
            "total": len(list(ma.coll_genres.aggregate(pipeline))),
            "populargenres": most_popular

        }
    )
    return jsonify(d)

@app.route("/years")
def _years():
    """ Return a detailed info of music through different years for heatmap """
    limit = request.args.get("limit")
    d = {}
    pipeline = [
        {"$project": {
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
            "_id": 0}},
    ]
    if limit:
        topk = int(limit)
        d["limit"] = topk
        pipeline.append({"$sort": {"year": ma.DESC}})
        pipeline.append({"$limit": topk})
    d.update({"data": list(ma.coll_years.aggregate(pipeline))})
    return jsonify(d)


@app.route("/select")
def _select():
    """ Return the node ids thae should be highlighted based on a user selection """
    d = {}
    node = request.args.get("node")  # either genre/artist name or track ID
    _limit = request.args.get("limit")
    _zoom = request.args.get("zoom")
    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")

    if node:
        # node_id = int(node)
        # d["node"] = node_id
        pass
    if not (node and dimx and dimy):
        return abort(
            400,
            description="a node ID, the zoom level, and the x and y dimensions are required to make a selection, e.g. /select?node=someID&zoom=1&dimx=acousticness&dimy=loudness",
        )

    topk = 6
    if _limit:
        topk = int(_limit)
        d["limit"] = topk

    zoom = 4
    if _zoom:
        zoom = int(_zoom)
        d["zoom"] = zoom

    if zoom_map[zoom] == "Genre":
        id_val = "genres"
        collection = ma.coll_genres
    elif zoom_map[zoom] == "Artist":
        id_val = "artists"
        collection = ma.coll_artists
    elif zoom_map[zoom] == "Track":
        id_val = "id"
        collection = ma.coll_tracks
    else:
        return abort(
            400,
            description="Got invalid value for zoom, does not correspond to genre, artists or track level",
        )

    project_stage = {
        "$project": {
            "id": "$" + id_val,
            "_id": 0,
        }
    }
    # include all dimensions/features
    [project_stage["$project"].update({dim: 1}) for dim in dimensions]
    pipeline = [
        # { '$limit': 10},
        project_stage,
    ]

    res = list(collection.aggregate(pipeline))
    selected = list(collection.aggregate([{"$match": {id_val: node}}, project_stage]))
    if len(selected) < 1:
        return abort(404, description=f"node with ID '{node}' was not found.")
    selected = selected[0]

    # extract 'vector' that is ordered unlike python dicts
    create_vector = lambda node: [node[dim] for dim in dimensions]

    # one of the most similar nodes is the node itself, can be excluded using processing/different method if needed
    cos_sim = cosine_similarity(
        np.array(list(map(lambda doc: create_vector(doc), res))),
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

    x_to_normspace = lambda x: np.interp(
        x,
        (x_min_abs, x_max_abs),
        (dim_absvals[dimx]["min"], dim_absvals[dimx]["max"]),
    )
    y_to_normspace = lambda y: np.interp(
        y,
        (y_min_abs, y_max_abs),
        (dim_absvals[dimy]["min"], dim_absvals[dimy]["max"]),
    )

    # find max and min values for dimensions for regions of interest (not sure if that is what is intended)
    for i in range(1, len(similar_nodes)):
        curr_node = similar_nodes[i][0]
        if curr_node[dimx] > similar_nodes[max_x_i][0][dimx]:
            max_x_i = i
        if curr_node[dimy] > similar_nodes[max_y_i][0][dimy]:
            max_y_i = i
        if curr_node[dimx] < similar_nodes[max_x_i][0][dimx]:
            min_x_i = i
        if curr_node[dimy] < similar_nodes[max_y_i][0][dimy]:
            min_y_i = i

    d.update(
        {
            "nodes": [tpl[0]["id"] for tpl in similar_nodes],
            "regions_of_interest": {
                "dimensions": {
                    "width": x_to_normspace(
                        similar_nodes[max_x_i][0][dimx]
                        - similar_nodes[min_x_i][0][dimx]
                    ),
                    "height": y_to_normspace(
                        similar_nodes[max_y_i][0][dimy]
                        - similar_nodes[min_y_i][0][dimy]
                    ),
                },
                "interest": [
                    {
                        "x": x_to_normspace(tpl[0][dimx]),
                        "y": y_to_normspace(tpl[0][dimy]),
                        "value": tpl[1],
                    }
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
    x = request.args.get("x")
    if x:
        nx = int(x)
        d["x"] = nx
    y = request.args.get("y")
    if y:
        ny = int(y)
        d["y"] = ny
    zoom = request.args.get("zoom")
    if zoom:
        nzoom = int(zoom)
        d["zoom"] = nzoom

    if not (x and y and zoom):
        return abort(
            400,
            description="you need to specify x and y coordinates, zoom level and x and y dimensions, e.g. /graph?x=100&y=200&zoom=3&dimx=acousticness&dimy=loudness",
        )

    dimx = request.args.get("dimx")
    dimy = request.args.get("dimy")

    x_min_abs, x_max_abs = (
        0,
        1000,
    )  # Arbitrary, not sure in which space/units these are in the frontend, pixels? If so, we need to handle different screen sizes/resizing at some point
    y_min_abs, y_max_abs = 0, 1000

    zoom_modifier = 500
    zoom_stage = (
        d["zoom"] % 3
    )  # Assuming 3 zoom levels per level of Genre, Artist, Track
    x_min, x_max = np.clip(
        [d["x"] - (zoom_stage * zoom_modifier), d["x"] + (zoom_stage * zoom_modifier)],
        x_min_abs,
        x_max_abs,
    )
    x_min, x_max = np.interp(
        [x_min, x_max],
        (x_min_abs, x_max_abs),
        (dim_absvals[dimx]["min"], dim_absvals[dimx]["max"]),
    )
    y_min, y_max = np.clip(
        [d["y"] - (zoom_stage * zoom_modifier), d["y"] + (zoom_stage * zoom_modifier)],
        y_min_abs,
        y_max_abs,
    )
    y_min, y_max = np.interp(
        [y_min, y_max],
        (y_min_abs, y_max_abs),
        (dim_absvals[dimy]["min"], dim_absvals[dimy]["max"]),
    )

    # the schema of the collections isn't completely the same thats why we have to change some names. Probably want to clean that up at some point, but should be fine for now
    if zoom_map[d["zoom"]] == "Genre":
        id_val = "genres"
        album_label = "$labels"
        name = "$genres"
        genre = ["$genres"]  # genres here is just a single literal string
        collection = ma.coll_genres
    elif zoom_map[d["zoom"]] == "Artist":
        id_val = "artists"
        album_label = "$labels"
        name = "$artists"
        genre = {"$ifNull": ["$genres", []]}
        collection = ma.coll_artists
    elif zoom_map[d["zoom"]] == "Track":
        id_val = "id"
        album_label = "$album_label"
        name = "$name"
        genre = {"$ifNull": ["$genres", []]}
        collection = ma.coll_tracks
    else:
        return abort(
            400,
            description="Got invalid value for zoom, does not correspond to genre, artists or track level",
        )
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
                dimx: f"${dimx}",
                dimy: f"${dimy}",
                "name": name,
                "size": {
                    "$toInt": {
                        "$divide": [
                            "$popularity",
                            dim_absvals["popularity"]["max"] / 100,
                        ]
                    }
                },
                "type": zoom_map[d["zoom"]],  # can be one of Genre, Artist or Song
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
        {
            "$group": {
                "_id": album_label,
                "members": {"$addToSet": "$" + id_val},
            }
        },
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
    for label in links_data[:3]:
        for src, dest in itertools.combinations(label["members"], 2):
            links.append(
                {
                    "src": src,
                    "dest": dest,
                    "color": label["color"],
                    "name": label["id"],
                    # "label": base64.b64encode(bytes(label['id'], 'utf-8')),
                    "label": base64.b64encode(bytes(label["id"], "utf-8")).decode(
                        "utf-8"
                    ),  # not sure if we can send bytes? if not we can decode the base64 encoded label name as utf-8 and send that, which is kinda messy. Or just use the (utf-8) label name to begin with (they are unique) but not sure how the frontend would deal with the spaces in these label names
                }
            )

    d.update(
        {
            "nodes": nodes,
            "links": links,
        }
    )
    return jsonify(d)
