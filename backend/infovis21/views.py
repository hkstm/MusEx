from flask import jsonify, request
from ..mongodb import MongoAccess as ma
from infovis21 import app
import numpy as np
import itertools
import base64

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


@app.route("/genres")
def genres():
    """ Return a list of all genres and their popularity for the wordcloud """
    limit = request.args.get("limit")
    d = {}
    if limit:
        topk = int(limit)
        d["limit"] = topk
        # sort the genres and limit
        pass

    pipeline = [
        { '$project': {'name' : '$genres', 'popularity' : '$popularity', '_id' : 0} },
    ]

    d.update(
        {
            "genres": list(ma.coll_genres.aggregate(pipeline))
        }
    )
    return jsonify(d)


@app.route("/select")
def select():
    """ Return the node ids that should be highlighted based on a user selection """
    d = {}
    node = request.args.get("node")
    if node:
        node_id = int(node)
        # this is the id that we make a selection based on
        d["node"] = node_id
    d.update(
        {
            "nodes": [1, 2, 3, 4, 5],
            "regions_of_interest": {
                "dimensions": {"width": 100, "height": 100},
                "interest": [
                    {"x": 0, "y": 0, "value": 0.1},
                    {"x": 0, "y": 1, "value": 0.2},
                ],
            },
        }
    )
    return jsonify(d)


@app.route("/graph")
def graph():
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
        
    x_dim = 'acousticness'
    y_dim = 'instrumentalness'
    x_min_abs, x_max_abs = 0, 1000 # Arbitrary, not sure in which space/units these are in the frontend, pixels? If so, we need to handle different screen sizes/resizing at some point
    y_min_abs, y_max_abs = 0, 1000

    dim_absvals = {
        'acousticness': {'max': 0.996, 'min': 0.0},
        'danceability': {'max': 0.988, 'min': 0.0},
        'duration_ms': {'max': 5338302, 'min': 4937},
        'energy': {'max': 1.0, 'min': 0.0},
        'explicit': {'max': 1, 'min': 0},
        'instrumentalness': {'max': 1.0, 'min': 0.0},
        'key': {'max': 11, 'min': 0},
        'liveness': {'max': 1.0, 'min': 0.0},
        'loudness': {'max': 3.855, 'min': -60.0},
        'mode': {'max': 1, 'min': 0},
        'popularity': {'max': 100, 'min': 0},
        'speechiness': {'max': 0.971, 'min': 0.0},
        'tempo': {'max': 243.507, 'min': 0.0},
        'valence': {'max': 1.0, 'min': 0.0},
        'year': {'max': 2021, 'min': 1920}
    }

    # x = 10
    # y = 500
    # zoom = 2

    zoom_modifier = 500
    genre_str = 'Genre'
    artist_str = 'Artist'
    track_str = 'Track' # this might be Song in the frontend not Track
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
    zoom_stage = zoom % 3  # Assuming 3 zoom levels per level of Genre, Artist, Track
    x_min, x_max = np.clip([x - (zoom_stage * zoom_modifier), x + (zoom_stage * zoom_modifier)], x_min_abs, x_max_abs)
    x_min, x_max = np.interp([x_min, x_max], (x_min_abs, x_max_abs), (dim_absvals[x_dim]['min'], dim_absvals[x_dim]['max']))
    y_min, y_max = np.clip([y - (zoom_stage * zoom_modifier), y + (zoom_stage * zoom_modifier)], y_min_abs, y_max_abs)
    y_min, y_max = np.interp([y_min, y_max], (y_min_abs, y_max_abs), (dim_absvals[y_dim]['min'], dim_absvals[y_dim]['max']))

    # the schema of the collections isn't completely the same thats why we have to change some names. Probably want to clean that up at some point, but should be fine for now
    if zoom_map[zoom] == 'Genre':
        id_val = "$genres"
        album_label = '$labels'
        name = '$genres'
        genre = ['$genres']  # genres here is just a single literal string
        collection = ma.coll_genres
    elif zoom_map[zoom] == 'Artist':
        id_val = "$artists"
        album_label = '$labels'
        name = '$artists'
        genre = {'$ifNull': [ "$genres", [] ]}
        collection = ma.coll_artists
    elif zoom_map[zoom] == 'Track':
        id_val = "$id"
        album_label = '$album_label'
        name = '$name'
        genre = {'$ifNull': [ "$genres", [] ]}
        collection = ma.coll_tracks
    else:
        raise ValueError('Got invalid value for zoom, does not correspond to genre, artists or track level')
    pipeline = [
        { '$match': {
            '$and': [
                { x_dim: {'$gte': x_min, '$lte': x_max } },
                { y_dim: {'$gte': y_min, '$lte': y_max } },
            ] 
        } },
        { '$project': {
            "id": { '$toString': "$_id"},
            x_dim : f'${x_dim}',
            y_dim : f'${y_dim}',
            "name": name,
            "size": { '$toInt': { '$divide': [ "$popularity", dim_absvals['popularity']['max']/100 ] }},
            "type": zoom_map[zoom],  # can be one of Genre, Artist or Song
            "genre": genre,
            "color": "#00000",
            '_id': 0,
        }}
    ]
    nodes = list(collection.aggregate(pipeline))
    pipeline = [
        { '$match': {
            '$and': [
                { x_dim: {'$gte': x_min, '$lte': x_max } },
                { y_dim: {'$gte': y_min, '$lte': y_max } },
            ] 
        } },
        { '$unwind': album_label},
        { '$group': {
            "_id": album_label,
            "members": { '$addToSet': id_val },
        }},
        { '$project': {
            "id": "$_id",
            "members": '$members',
            "color": "black",  # needs to be set programmatically
        }},
    ]
    links_data = list(collection.aggregate(pipeline))
    links = []
    for label in links_data[:3]:
        for src, dest in itertools.combinations(label['members'], 2):
            links.append(
                {
                    "src": src,
                    "dest": dest,
                    "color": label['color'],
                    "name": label['id'],
                    # "label": base64.b64encode(bytes(label['id'], 'utf-8')),
                    "label": base64.b64encode(bytes(label['id'], 'utf-8')).decode('utf-8'),  # not sure if we can send bytes? if not we can decode the base64 encoded label name as utf-8 and send that, which is kinda messy. Or just use the (utf-8) label name to begin with (they are unique) but not sure how the frontend would deal with the spaces in these label names
                }
            )

    d.update(
        {
            "nodes": nodes,
            "links": links,
        }
    )
    return jsonify(d)
