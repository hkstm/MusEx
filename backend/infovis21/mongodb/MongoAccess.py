import ast

import pandas as pd
import pymongo
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

coll_genres, coll_years, coll_tracks, coll_artists = [db[name] for name in collnames]
coll_albums = db["albums"]
coll_labels = db["labels"]


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
