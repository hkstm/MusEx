from flask import jsonify, request
from ..mongodb import MongoAccess as ma
from infovis21 import app


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
    d.update(
        {
            "nodes": [
                {
                    "id": 12,
                    "name": "Flume",
                    "size": 12,
                    "type": "Genre",  # can be one of Genre, Artist or Song
                    "genre": "Rock",
                    "color": "#00000",
                },
            ],
            "links": [
                {
                    "src": 12,
                    "dest": 13,
                    "color": "black",
                    "name": "a label",
                    "label": 1,
                },
            ],
        }
    )
    return jsonify(d)
