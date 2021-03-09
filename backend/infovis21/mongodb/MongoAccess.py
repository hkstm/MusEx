import ast

import pandas as pd
import pymongo
from flask import abort
from pymongo import MongoClient

ASC = pymongo.ASCENDING
DESC = pymongo.DESCENDING

client = MongoClient("mongodb://root:example@localhost:27017/")
db = client["kaggle"]

collnames = [
    "genres",
    "years",
    "tracks",
    "artists",
]

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
    # "year"  # year not included in genre and artist collection by default, lots of values seem to default to the year 1920 so I haven't manually calculated them for year and artist by grouping and taking average for example
]

genre_str = "Genre"
artist_str = "Artist"
track_str = "Track"  # this might be Song in the frontend not Track

coll_genres, coll_years, coll_tracks, coll_artists = [db[name] for name in collnames]
coll_albums = db["albums"]
coll_labels = db["labels"]
coll_dim_minmax = db["dim_minmax"]


def map_zoom_to_mongo(zoom):
    # I'll factor this and the mongodb related logic out of this file when we have a functional prototype
    # zoom_map = {
    #     1: genre_str,
    #     2: genre_str,
    #     3: genre_str,
    #     4: artist_str,
    #     5: artist_str,
    #     6: artist_str,
    #     7: track_str,
    #     8: track_str,
    #     9: track_str,
    # }
    zoom_map = {
        "genre": genre_str,
        "artist": artist_str,
        "track": track_str,
    }
    mongo_values = {}
    mongo_values["coll_type"] = zoom_map[zoom]
    # the schema of the collections isn't completely the same thats why we have to change some names. Probably want to clean that up at some point, but should be fine for now
    if mongo_values["coll_type"] == genre_str:
        mongo_values["id_val"] = "genres"
        mongo_values["album_label"] = "$labels"
        mongo_values["name"] = "$genres"
        mongo_values["genre"] = [
            "$genres"
        ]  # genres here is just a single literal string
        mongo_values["collection"] = coll_genres
    elif mongo_values["coll_type"] == artist_str:
        mongo_values["id_val"] = "artists"
        mongo_values["album_label"] = "$labels"
        mongo_values["name"] = "$artists"
        mongo_values["genre"] = {"$ifNull": ["$genres", []]}
        mongo_values["collection"] = coll_artists
    elif mongo_values["coll_type"] == track_str:
        mongo_values["id_val"] = "id"
        mongo_values["album_label"] = "$album_label"
        mongo_values["name"] = "$name"
        mongo_values["genre"] = {"$ifNull": ["$genres", []]}
        mongo_values["collection"] = coll_tracks
    else:
        return abort(
            400,
            description="Got invalid value for zoom, does not correspond to genre, artists or track level",
        )
    return mongo_values


def load_kaggle_csvs_into_mongodb():
    filenames = [
        "data_by_genres",
        "data_by_year",
        "data",
        "data_w_genres",
    ]

    filenames_collection_map = dict(zip(filenames, collnames))

    csv_paths = [f"../data/kaggle/{filename}.csv" for filename in filenames]

    df_list = [pd.read_csv(path) for path in csv_paths]

    for i, df in enumerate(df_list):
        if "id" in df:
            df = df.drop_duplicates(subset=["id"])

    df_list[2] = df_list[2].apply(
        lambda x: ast.literal_eval(x)
    )  # Artists is supposed to be a list in this csv
    [
        db[filename].drop() for filename in filenames
    ]  # make sure collections in mongo are empty before inserting
    # insert documents corresponding to csv in mongodb
    [
        db[filenames_collection_map[filename]].insert_many(
            df_list[idx].to_dict("records")
        )
        for idx, filename in enumerate(filenames)
    ]


def get_from_mongo(collection, pipeline):
    return list(collection.aggregate(list(pipeline)))  # pipeline is a tuple until now


# to make pipelines immutable for easier debugging and more intuitive default arg wise pipeline is a tuple
def get_collection(collection, pipeline=(), limit=0):
    pipeline += (
        {
            "$unset": ["_id"]
        },  # <- this comma is the easiest way (I think) to make sure that what you're adding to the pipeline is a tuple as well
    )
    if limit:
        pipeline += ({"$limit": limit},)
    return get_from_mongo(collection, pipeline)


def single_to_list(x):
    return [x] if not isinstance(x, list) else x


def get_tracks_by(query, field, pipeline=(), limit=0):
    query = single_to_list(query)
    pipeline += ({"$match": {field: {"$in": query}}},)
    return get_collection(coll_tracks, pipeline, limit)


def get_tracks_by_ids(track_ids, pipeline=(), limit=0):
    return get_tracks_by(track_ids, "id", pipeline, limit)


def get_tracks_by_genres(genres, pipeline=(), limit=0):
    return get_tracks_by(genres, "genres", pipeline, limit)


def get_tracks_by_labels(labels, pipeline=(), limit=0):
    return get_tracks_by(labels, "album_label", pipeline, limit)


def get_tracks_by_names(track_names, pipeline=(), limit=0):
    return get_tracks_by(track_names, "name", pipeline, limit)


def get_tracks_by_filter(pipeline, limit=0):
    return get_collection(coll_tracks, pipeline, limit)


def get_all_tracks_id(pipeline=()):
    pipeline += (
        {
            "$project": {"_id": 1, "id": 1}
        },  # <- _id refers to mongo's internal object id, id to spotify's id
    )
    return get_from_mongo(coll_tracks, pipeline)


def update_dim_minmax():
    pipeline = [
        {
            "$group": {
                "_id": None,
                "min_acousticness": {"$min": "$acousticness"},
                "min_danceability": {"$min": "$danceability"},
                "min_duration_ms": {"$min": "$duration_ms"},
                "min_energy": {"$min": "$energy"},
                "min_explicit": {"$min": "$explicit"},
                "min_instrumentalness": {"$min": "$instrumentalness"},
                "min_key": {"$min": "$key"},
                "min_liveness": {"$min": "$liveness"},
                "min_loudness": {"$min": "$loudness"},
                "min_mode": {"$min": "$mode"},
                "min_popularity": {"$min": "$popularity"},
                "min_speechiness": {"$min": "$speechiness"},
                "min_tempo": {"$min": "$tempo"},
                "min_valence": {"$min": "$valence"},
                "min_year": {"$min": "$year"},
                "max_acousticness": {"$max": "$acousticness"},
                "max_danceability": {"$max": "$danceability"},
                "max_duration_ms": {"$max": "$duration_ms"},
                "max_energy": {"$max": "$energy"},
                "max_explicit": {"$max": "$explicit"},
                "max_instrumentalness": {"$max": "$instrumentalness"},
                "max_key": {"$max": "$key"},
                "max_liveness": {"$max": "$liveness"},
                "max_loudness": {"$max": "$loudness"},
                "max_mode": {"$max": "$mode"},
                "max_popularity": {"$max": "$popularity"},
                "max_speechiness": {"$max": "$speechiness"},
                "max_tempo": {"$max": "$tempo"},
                "max_valence": {"$max": "$valence"},
                "max_year": {"$max": "$year"},
            }
        },
        {
            "$project": {
                "acousticness": {
                    "min": "$min_acousticness",
                    "max": "$max_acousticness",
                },
                "danceability": {
                    "min": "$min_acousticness",
                    "max": "$max_danceability",
                },
                "duration_ms": {"min": "$min_duration_ms", "max": "$max_duration_ms",},
                "energy": {"min": "$min_energy", "max": "$max_energy",},
                "explicit": {"min": "$min_explicit", "max": "$max_explicit",},
                "instrumentalness": {
                    "min": "$min_instrumentalness",
                    "max": "$max_instrumentalness",
                },
                "key": {"min": "$min_key", "max": "$max_key",},
                "liveness": {"min": "$min_liveness", "max": "$max_liveness",},
                "loudness": {"min": "$min_loudness", "max": "$max_loudness",},
                "mode": {"min": "$min_mode", "max": "$max_mode",},
                "popularity": {"min": "$min_popularity", "max": "$max_popularity",},
                "speechiness": {"min": "$min_speechiness", "max": "$max_speechiness",},
                "tempo": {"min": "$min_tempo", "max": "$max_tempo",},
                "valence": {"min": "$min_valence", "max": "$max_valence",},
                "year": {"min": "$min_year", "max": "$max_year",},
                "_id": 0,
            }
        },
        {"$out": "dim_minmax"},
    ]
    coll_tracks.aggregate(pipeline)


def get_dim_minmax():
    try:
        return list(coll_dim_minmax.aggregate([{"$unset": ["_id"]}]))[0]
    except IndexError:
        update_dim_minmax()
        return list(coll_dim_minmax.aggregate([{"$unset": ["_id"]}]))[0]
