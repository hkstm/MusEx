import ast
import uuid
from datetime import datetime
from pprint import pprint

import dotenv
import pandas as pd
import pymongo
import spotipy
from flask import abort
from pymongo import MongoClient
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth

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
    "speechiness",
    "tempo",
    "valence",
    "popularity",
    "key",
    "mode",
    "acousticness",
    "instrumentalness",
    "liveness",
    "loudness",
    # "year"  # year not included in genre and artist collection by default, lots of values seem to default to the year 1920 so I haven't manually calculated them for year and artist by grouping and taking average for example
]

genre_str = "Genre"
artist_str = "Artist"
track_str = "Track"  # this might be Song in the frontend not Track

coll_genres = db["genres_api"]
coll_artists = db["artists_api"]
coll_tracks = db["tracks_api"]
coll_albums = db["albums_api"]
coll_labels = db["labels_api"]
coll_years = db["years_api"]

coll_dim_minmax = db["dim_minmax"]
coll_genre_pop = db["genre_popularity_per_year"]
coll_artist_pop = db["artist_popularity_per_year"]


def create_ids(coll):
    res = coll.aggregate([{"$project": {"_id": 1}}])
    for doc in list(res):
        coll.update_one({"_id": doc["_id"]}, {"$set": {"id": str(uuid.uuid4())}})


def load_kaggle_csvs_into_mongodb():
    # dotenv.load_dotenv()
    # sp = spotipy.Spotify(
    #  auth_manager=SpotifyOAuth(), requests_timeout=100, retries=5, status_retries=5
    # )
    db["albums"].drop()
    db["artists"].drop()
    db["dim_minmax"].drop()
    db["genres"].drop()
    db["labels"].drop()
    db["years"].drop()
    db["tracks"].drop()

    print(f"Starting pipeline: {datetime.now()}")
    # load in csvs
    df_tracks = pd.read_csv(f"../data/kaggle/data.csv")
    df_tracks = df_tracks.drop_duplicates(subset=["id"])

    # column supposed to be list but stored as string e.g. "['Mamie Smith']"
    df_tracks["artists"] = df_tracks["artists"].apply(lambda x: ast.literal_eval(x))

    # column supposed to be year but stored as string e.g. "2011"
    df_tracks["year"] = df_tracks["year"].astype(int)

    # create base tracks MongoDB collection from dataframe
    db["tracks"].drop()
    db["tracks"].insert_many(df_tracks.to_dict("records"))
    print(f"Created base tracks collection: {datetime.now()}")

    # Adding Spotipy data
    all_tracks = list(
        db["tracks"].aggregate(
            [
                {"$match": {"$expr": {"$eq": [{"$type": "$spotipy"}, "missing"]}}},
                {"$project": {"id": 1, "_id": 0}},
            ]
        )
    )
    n_tracks = len(all_tracks)
    for i, track in enumerate(all_tracks):
        res = sp.track(track["id"])
        del res["available_markets"]
        del res["album"]["available_markets"]
        db["tracks"].update_one({"id": track["id"]}, {"$set": {"spotipy": res}})
        if i % 10000 == 0:
            print(f"Done {i}\tout of {n_tracks}\t at {datetime.now()}")

    print(f"Added spotipy data to tracks: {datetime.now()}")

    db["tracks"].create_index("id")

    # Creates the album collection
    def get_album_data(album_id):
        album = sp.album(album_id)
        results = album["tracks"]
        # if doc right would only happen if album contains more than a 100 songs, which is never according to my googling
        while results["next"]:
            results = sp.next(results)
            album["tracks"]["items"].extend(results["items"])

        # there is some info in the album that we do not need as we have seperate track and artist collections
        album_bare = dict()
        for key in [
            "id",
            "album_type",
            "genres",
            "label",
            "name",
            "popularity",
            "release_date",
            "release_date_precision",
            "total_tracks",
            "type",
        ]:
            album_bare[key] = album[key]
        album_bare["artists"] = [{"id": artist["id"]} for artist in album["artists"]]
        album_bare["tracks"] = [
            {"id": track["id"]} for track in album["tracks"]["items"]
        ]
        return album_bare

    all_album_uris = [
        d["album_uri"]
        for d in list(
            db["tracks"].aggregate(
                [{"$project": {"album_uri": "$spotipy.album.uri", "_id": 0}}]
            )
        )
    ]
    db["albums"].drop()
    for album_id in set(all_album_uris):
        db["albums"].insert_one(get_album_data(album_id))

    db["albums"].create_index("id")

    # Extract Album data from Spotipy track data and merge with Spotipy album data to albums_merged
    db["albums_merged"].drop()
    (
        db["tracks"].aggregate(
            [
                {"$replaceRoot": {"newRoot": "$spotipy.album"}},
                {"$project": {"root": "$$ROOT", "uri": "$uri"}},
                {"$group": {"_id": "$uri", "root": {"$first": "$root"},}},
                {"$replaceRoot": {"newRoot": "$root"}},
                {
                    "$lookup": {
                        "from": "albums",
                        "localField": "id",
                        "foreignField": "id",
                        "as": "albums_docs",
                    }
                },
                {"$unwind": "$albums_docs"},
                {
                    "$set": {
                        "album_type": "$albums_docs.album_type",
                        "artists": "$albums_docs.artists",
                        "genres": "$albums_docs.genres",
                        "id": "$albums_docs.id",
                        "label": "$albums_docs.label",
                        "name": "$albums_docs.name",
                        "popularity": "$albums_docs.popularity",
                        "release_date": "$albums_docs.release_date",
                        "release_date_precision": "$albums_docs.release_date_precision",
                        "total_tracks": "$albums_docs.total_tracks",
                        "tracks": "$albums_docs.tracks",
                        "type": "$albums_docs.type",
                    }
                },
                {"$unset": "albums_docs"},
                {"$out": "albums_merged"},
            ]
        )
    )
    db["albums_merged"].create_index("id")
    print(f"Created albums_merged: {datetime.now()}")

    # Merge original track data and artist and album_id spotipy data
    db["tracks_spotipy_merged"].drop()
    db["tracks"].aggregate(
        [
            {
                "$set": {
                    "artists": "$spotipy.artists",
                    "albums": "$spotipy.album.id",
                    "disc_number": "$spotipy.disc_number",
                    "duration_ms": "$spotipy.duration_ms",
                    "explicit": "$spotipy.explicit",
                    "external_ids": "$spotipy.external_ids",
                    "external_urls": "$spotipy.external_urls",
                    "href": "$spotipy.href",
                    "id": "$spotipy.id",
                    "is_local": "$spotipy.is_local",
                    "name": "$spotipy.name",
                    "popularity": "$spotipy.popularity",
                    "preview_url": "$spotipy.preview_url",
                    "track_number": "$spotipy.track_number",
                    "type": "$spotipy.type",
                    "uri": "$spotipy.uri",
                }
            },
            {"$unset": ["spotipy"]},
            {"$out": "tracks_spotipy_merged"},
        ]
    )
    db["tracks_spotipy_merged"].create_index("id")
    print(f"Created tracks_spotipy_merged: {datetime.now()}")

    # Extract Artist data from spotipy data to artist_extracted
    db["artists"].drop()
    res = db["tracks_spotipy_merged"].aggregate(
        [{"$unwind": "$artists"}, {"$group": {"_id": "$artists.id",}}]
    )
    [db["artists"].insert_one(sp.artist(doc["_id"])) for doc in res]
    db["artists"].create_index("id")
    print(f"Created artists: {datetime.now()}")

    # Filter out artists without genre, imputation needs to be done before this step if used
    db["artists_with_genres"].drop()
    db["artists"].aggregate(
        [
            {"$match": {"$expr": {"$ne": [{"$size": "$genres"}, 0]}}},
            {"$out": "artists_with_genres"},
        ]
    )
    db["artists_with_genres"].create_index("id")

    # Merge regular track data with genre data
    db["tracks_with_genres"].drop()
    db["tracks_spotipy_merged"].aggregate(
        [
            {"$unwind": "$artists"},
            {
                "$lookup": {
                    "from": "artists_with_genres",
                    "foreignField": "id",
                    "localField": "artists.id",
                    "as": "artists_doc",
                }
            },
            {"$unwind": "$artists_doc"},
            {"$set": {"genres": "$artists_doc.genres"}},
            {"$unset": "artists_doc"},
            {"$set": {"root": "$$ROOT"}},
            {"$unwind": "$genres"},
            {
                "$group": {
                    "_id": "$id",
                    "genres": {"$addToSet": "$genres"},
                    "artists": {"$addToSet": "$root.artists"},
                    "root": {"$first": "$root"},
                }
            },
            {"$set": {"root.genres": "$genres", "root.artists": "$artists"}},
            {"$replaceRoot": {"newRoot": "$root"}},
            {"$out": "tracks_with_genres"},
        ],
        allowDiskUse=True,
    )
    db["tracks_with_genres"].create_index("albums")
    print(f"Created tracks_with_genres: {datetime.now()}")

    # Merge track data with label data
    db["tracks_full"].drop()
    db["tracks_with_genres"].aggregate(
        [
            {
                "$lookup": {
                    "from": "albums_merged",
                    "foreignField": "id",
                    "localField": "albums",
                    "as": "albums_doc",
                }
            },
            {"$unwind": "$albums_doc"},
            {
                "$set": {
                    "labels": "$albums_doc.label",
                    "explicit": {"$toInt": "$explicit"},
                }
            },
            {"$unset": "albums_doc"},
            {"$out": "tracks_full"},
        ],
        allowDiskUse=True,
    )
    db["tracks_full"].create_index("id")
    db["tracks_full"].create_index("artists.id")
    print(f"Created tracks_full: {datetime.now()}")

    # Aggregate MongoDB collection for artists based on base artist and track data, all have at least 1 genre
    db["artists_full"].drop()
    db["artists_with_genres"].aggregate(
        [
            {
                "$lookup": {
                    "from": "tracks_full",
                    "foreignField": "artists.id",
                    "localField": "id",
                    "as": "tracks_doc",
                }
            },
            {"$unwind": "$tracks_doc"},
            {"$unwind": "$tracks_doc.artists"},
            {"$match": {"$expr": {"$eq": ["$name", "$tracks_doc.artists.name"]}}},
            {"$set": {"tracks_doc.root": "$$ROOT"}},
            {"$unset": ["tracks_doc.root.tracks_doc"]},
            {"$replaceRoot": {"newRoot": "$tracks_doc"}},
            {
                "$group": {
                    "_id": "$artists.id",
                    "tracks_id": {"$addToSet": "$id"},
                    "labels": {"$addToSet": "$labels"},
                    "preview_url": {"$first": "$preview_url"},
                    "root": {"$first": "$root"},
                    "danceability": {"$avg": "$danceability"},
                    "duration_ms": {"$avg": "$duration_ms"},
                    "energy": {"$avg": "$energy"},
                    "instrumentalness": {"$avg": "$instrumentalness"},
                    "liveness": {"$avg": "$liveness"},
                    "loudness": {"$avg": "$loudness"},
                    "speechiness": {"$avg": "$speechiness"},
                    "tempo": {"$avg": "$tempo"},
                    "valence": {"$avg": "$valence"},
                    "popularity": {"$avg": "$popularity"},
                    "key": {"$avg": "$key"},
                    "mode": {"$avg": "$mode"},
                    "acousticness": {"$avg": "$acousticness"},
                    "year": {"$avg": "$year"},
                    "popularity": {"$avg": "$popularity"},
                }
            },
            {
                "$set": {
                    "root.tracks_id": "$tracks_id",
                    "root.labels": "$labels",
                    "root.preview_url": "$preview_url",
                    "root.danceability": "$danceability",
                    "root.duration_ms": "$duration_ms",
                    "root.energy": "$energy",
                    "root.instrumentalness": "$instrumentalness",
                    "root.liveness": "$liveness",
                    "root.loudness": "$loudness",
                    "root.speechiness": "$speechiness",
                    "root.tempo": "$tempo",
                    "root.valence": "$valence",
                    "root.popularity": "$popularity",
                    "root.key": "$key",
                    "root.mode": "$mode",
                    "root.acousticness": "$acousticness",
                    "root.year": "$year",
                    "root.popularity": "$popularity",  # overwriting artist popularity, now aggregate of tracks in database
                }
            },
            {"$replaceWith": "$root"},
            {"$out": "artists_full"},
        ]
    )
    db["artists_full"].create_index("id")
    print(f"Created artists_full: {datetime.now()}")

    # Aggregate MongoDB collection for genres based on track data
    db["genres_full"].drop()
    db["tracks_full"].aggregate(
        [
            {"$unwind": "$genres"},
            {
                "$group": {
                    "_id": "$genres",
                    "tracks_id": {"$addToSet": "$id"},
                    "labels": {"$addToSet": "$labels"},
                    "preview_url": {"$first": "$preview_url"},
                    "danceability": {"$avg": "$danceability"},
                    "duration_ms": {"$avg": "$duration_ms"},
                    "energy": {"$avg": "$energy"},
                    "instrumentalness": {"$avg": "$instrumentalness"},
                    "liveness": {"$avg": "$liveness"},
                    "loudness": {"$avg": "$loudness"},
                    "speechiness": {"$avg": "$speechiness"},
                    "tempo": {"$avg": "$tempo"},
                    "valence": {"$avg": "$valence"},
                    "popularity": {"$avg": "$popularity"},
                    "key": {"$avg": "$key"},
                    "mode": {"$avg": "$mode"},
                    "acousticness": {"$avg": "$acousticness"},
                    "year": {"$avg": "$year"},
                    "popularity": {"$avg": "$popularity"},
                }
            },
            {"$out": "genres_full"},
        ]
    )
    create_ids(db["genres_full"])
    db["genres_full"].create_index("id")
    print(f"Created genres_full: {datetime.now()}")

    # Factor collection so they only contain data necessary for API to function

    project_stage = {
        "$project": {
            "id": 1,
            "name": 1,
            "preview_url": 1,
            "genres": 1,
            "labels": 1,
            "danceability": 1,
            "duration_ms": 1,
            "energy": 1,
            "instrumentalness": 1,
            "liveness": 1,
            "loudness": 1,
            "speechiness": 1,
            "tempo": 1,
            "valence": 1,
            "popularity": 1,
            "key": 1,
            "mode": 1,
            "acousticness": 1,
            "year": 1,
            "popularity": 1,
        }
    }

    # Aggregate MongoDB collection for genres based on track data
    db["years_full"].drop()
    res = db["tracks_full"].aggregate(
        [
            {"$unwind": "$genres"},
            {
                "$group": {
                    "_id": "$year",
                    "tracks_id": {"$addToSet": "$id"},
                    "genres": {"$addToSet": "$genres"},
                    "labels": {"$addToSet": "$labels"},
                    "preview_url": {"$first": "$preview_url"},
                    "danceability": {"$avg": "$danceability"},
                    "duration_ms": {"$avg": "$duration_ms"},
                    "energy": {"$avg": "$energy"},
                    "instrumentalness": {"$avg": "$instrumentalness"},
                    "liveness": {"$avg": "$liveness"},
                    "loudness": {"$avg": "$loudness"},
                    "speechiness": {"$avg": "$speechiness"},
                    "tempo": {"$avg": "$tempo"},
                    "valence": {"$avg": "$valence"},
                    "popularity": {"$avg": "$popularity"},
                    "key": {"$avg": "$key"},
                    "mode": {"$avg": "$mode"},
                    "acousticness": {"$avg": "$acousticness"},
                    "year": {"$avg": "$year"},
                    "popularity": {"$avg": "$popularity"},
                }
            },
            {"$set": {"id": "$_id", "name": "$_id"}},
            {"$out": "years_full"},
        ]
    )

    # Create years_api
    db["years_api"].drop()
    res = db["years_full"].aggregate([project_stage, {"$project": {"_id": 0}}])
    for doc in list(res):
        db["years_api"].insert_one(doc)
    db["years_api"].create_index("id")

    # Create genres_api
    db["genres_api"].drop()
    res = db["genres_full"].aggregate(
        [
            {"$set": {"name": "$_id", "genres": ["$_id"]}},
            project_stage,
            {"$project": {"_id": 0}},
        ]
    )
    for doc in list(res):
        db["genres_api"].insert_one(doc)
    db["genres_api"].create_index("id")

    # Create artists_api
    db["artists_api"].drop()
    res = db["artists_full"].aggregate([project_stage, {"$out": "artists_api"},])
    db["artists_api"].create_index("id")

    # Create tracks_api
    db["tracks_api"].drop()
    res = db["tracks_full"].aggregate(
        [{"$set": {"labels": ["$labels"]}}, project_stage, {"$out": "tracks_api"},]
    )
    db["tracks_api"].create_index("id")

    # Create labels_full and labels_api
    db["labels_full"].drop()
    db["tracks_full"].aggregate(
        [
            {"$unwind": "$artists"},
            {"$unwind": "$genres"},
            {
                "$group": {
                    "_id": "$labels",
                    "track_set": {"$addToSet": "$id"},
                    "artist_set": {"$addToSet": "$artists.id"},
                    "genres": {"$addToSet": "$genres"},
                    "preview_url": {"$first": "$preview_url"},
                }
            },
            {
                "$set": {
                    "n_tracks": {"$size": "$track_set"},
                    "n_artists": {"$size": "$artist_set"},
                }
            },
            {"$out": "labels_full"},
        ]
    )
    create_ids(db["labels_full"])
    db["labels_full"].create_index("id")

    db["labels_api"].drop()
    res = db["labels_full"].aggregate(
        [
            {"$project": {"name": "$_id", "n_tracks": 1, "n_artists": 1,}},
            {"$project": {"_id": 0}},
        ]
    )
    for doc in list(res):
        db["labels_api"].insert_one(doc)
    db["labels_api"].create_index("id")

    db["artist_popularity_per_year"].drop()
    res = db["tracks_full"].aggregate(
        [
            {"$project": {"artists": 1, "year": 1, "popularity": 1}},
            {"$unwind": "$artists"},
            {
                "$group": {
                    "_id": {"year": "$year", "artist": "$artists.id"},
                    "popularity": {"$avg": "$popularity"},
                }
            },
            {
                "$project": {
                    "artist": "$_id.artist",
                    "year": "$_id.year",
                    "popularity": 1,
                    "_id": 0,
                }
            },
            {"$sort": {"year": 1, "popularity": -1}},
            {"$out": "artist_popularity_per_year"},
        ],
        allowDiskUse=True,
    )
    db["artist_popularity_per_year"].create_index("year")

    db["genre_popularity_per_year"].drop()
    res = db["tracks_full"].aggregate(
        [
            {"$project": {"genres": 1, "year": 1, "popularity": 1}},
            {"$unwind": "$genres"},
            {
                "$group": {
                    "_id": {"year": "$year", "genre": "$genres"},
                    "popularity": {"$avg": "$popularity"},
                }
            },
            {
                "$project": {
                    "genre": "$_id.genre",
                    "year": "$_id.year",
                    "popularity": 1,
                    "_id": 0,
                }
            },
            {"$sort": {"year": 1, "popularity": -1}},
            {"$out": "genre_popularity_per_year"},
        ],
        allowDiskUse=True,
    )
    db["genre_popularity_per_year"].create_index("year")

    print(f"Created api collections: {datetime.now()}")

    db["albums"].drop()
    db["albums_merged"].rename("albums")

    db["artists_with_genres"].drop()
    db["artists"].drop()

    db["tracks_spotipy_merged"].drop()
    db["tracks_with_genres"].drop()
    db["tracks"].drop()

    update_dim_minmax()

    print(f"Finished pipeline: {datetime.now()}")


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
    return get_tracks_by(labels, "labels", pipeline, limit)


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
    db["dim_minmax"].drop()
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
