from infovis21.mongodb import MongoAccess as ma


def create_album_collection():
    pipeline = [
        {"$unwind": "$tracks"},
        {
            "$lookup": {
                "from": "tracks",
                "localField": "tracks.id",
                "foreignField": "id",
                "as": "track_docs",
            }
        },
        {"$unwind": "$track_docs"},
        {
            "$group": {
                "_id": "$id",
                "acousticness": {"$avg": "$track_docs.acousticness"},
                "danceability": {"$avg": "$track_docs.danceability"},
                "duration_ms": {"$avg": "$track_docs.duration_ms"},
                "energy": {"$avg": "$track_docs.energy"},
                "explicit": {"$avg": "$track_docs.explicit"},
                "instrumentalness": {"$avg": "$track_docs.instrumentalness"},
                "key": {"$avg": "$track_docs.key"},
                "liveness": {"$avg": "$track_docs.liveness"},
                "loudness": {"$avg": "$track_docs.loudness"},
                "mode": {"$avg": "$track_docs.mode"},
                "popularity": {"$avg": "$track_docs.popularity"},
                "speechiness": {"$avg": "$track_docs.speechiness"},
                "tempo": {"$avg": "$track_docs.tempo"},
                "valence": {"$avg": "$track_docs.valence"},
                "year": {"$avg": "$track_docs.year"},
                "tracks": {"$addToSet": "$tracks"},
                "genres": {"$first": "$genres"},
                "type": {"$first": "$type"},
                "oid": {"$first": "$_id"},
                "album_type": {"$first": "$album_type"},
                "artists": {"$first": "$artists"},
                "label": {"$first": "$label"},
                "name": {"$first": "$name"},
                "popularity": {"$first": "$popularity"},
                "release_date": {"$first": "$release_date"},
                "release_date_precision": {"$first": "$release_date_precision"},
                "total_tracks": {"$first": "$total_tracks"},
            }
        },
        {"$set": {"_id": "$oid", "id": "$_id"}},
        {"$unset": "oid"},
        # {"$out": "album_audio_analysis"},
    ]
    return list(ma.coll_albums.aggregate(pipeline, allowDiskUse=True))


def add_labels_to_genres():
    pipeline = [
        {"$unwind": "$genres"},
        {"$unwind": "$labels"},
        {"$group": {"_id": "$genres", "labels": {"$addToSet": "$labels"},}},
        {
            "$lookup": {
                "from": "genres",
                "localField": "_id",
                "foreignField": "genres",
                "as": "genre_lookup",
            }
        },
        {"$unwind": "$genre_lookup"},
        {"$set": {"genre_lookup.labels": "$labels"}},
        {"$replaceRoot": {"newRoot": "$genre_lookup"}},
        # {"$out": "genres_with_labels"},
    ]
    return list(ma.coll_artists.aggregate(pipeline))


def compute_min_max():
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
    ]
    return list(ma.coll_tracks.aggregate(pipeline))[0]
