from infovis21.datamodel.Track import Track
from infovis21.datamodel.User import User
from infovis21.mongodb import MongoAccess as ma
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pprint import pprint



from sklearn.cluster import KMeans
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
import pandas as pd
import numpy as np
import sklearn
from sklearn.preprocessing import MinMaxScaler
import os

df_genres = pd.DataFrame(ma.get_collection(ma.coll_genres))
df = df_genres.drop(['tempo', 'labels', 'liveness', 'loudness', 'key', 'mode', 'preview_url', 'id', 'name',  'genres', 'year', 'duration_ms', 'popularity'], axis=1)

# run K-Means Clustering

from sklearn.cluster import KMeans
try:
    Kmean = KMeans(n_clusters=40, init='k-means++', n_init=15, max_iter=300, tol=0.0001, precompute_distances='auto', verbose=0, random_state=0, copy_x=True, n_jobs=None, algorithm='auto')
    Kmean.fit(df)

    df['label'] = pd.DataFrame(Kmean.labels_)

    df = pd.concat([df_genres.genres, df],axis=1)

    # labeling of main genre based on genres 

    df.label = df.label.replace([2, 6, 23, 30], "Electronic") #middle dance, low instrumentalness, lower speechiness, medium valence, low acousticness

    df.label = df.label.replace([1, 3, 14, 17, 38], "Pop") #middle dance, low to middle instrumentalness, low to middle speechiness, medium valence, high accoustincess
    
    df.label = df.label.replace([8, 16, 20], "Hiphop") # high dance, low to middle instrumental, low speechiness, medium to high valence, low acoustincess

    df.label = df.label.replace([0, 9, 11, 18, 22], "Classical") # low to medium dance, low to medium instru, low speechiness, medium to high valence, low acoustincess

    df.label = df.label.replace([4, 12, 19, 27, 32, 37, 39], "Rock")

    df.label = df.label.replace([5, 7, 10, 13, 15, 21, 24, 25, 26, 28, 29, 31, 33, 34, 35, 36], "Indie")

    # replace colors with suitable color code
    def label_color(df):
        if df['label'] == "Classical" :
            return '#9370db' # purple
        if df['label'] == "Electronic":
            return '#32cd32' # green
        if df['label'] == "Hiphop":
            return '#ffbf00' # orange 
        if df['label'] == "Rock":
            return '#ff0000' # red
        if df['label'] == "Pop":
            return '#ff69b4' # pink
        if df['label'] == "Indie":
            return '#1e90ff' # blue

    def label_to_color(label):
        if label == "Classical" :
            return '#9370db' # purple
        if label == "Electronic":
            return '#32cd32' # green
        if label == "Hiphop":
            return '#ffbf00' # orange 
        if label == "Rock":
            return '#ff0000' # red
        if label == "Pop":
            return '#ff69b4' # pink
        if label == "Indie":
            return '#1e90ff' # blue

    df['label_color'] = df.apply(label_color, axis=1)

    # Adding genre/color data to mongo collections

    from pymongo import MongoClient
    client = MongoClient("mongodb://root:example@localhost:27017/")
    db = client["kaggle"]

    for index, row in df.iterrows():
        db['genres_full'].update_one({"_id": row['genres'][0]}, {"$set": {"genre_super": row['label'], 'genre_color': row['label_color']}})

    def update_coll_genreclustering(coll_name):
        '''Determines which genre cluster a node in the graph belongs to, if it has multiple (sub)genres then the most frequent genre cluster that these (sub)genres belong to is selected'''
        pipeline = [
            {'$unwind': '$genres'},
            {
                "$lookup": {
                    "from": "genres_full",
                    "foreignField": "_id",
                    "localField": "genres",
                    "as": "genres_doc",
                }
            },
            {"$unwind": "$genres_doc"},
            {"$set": {
                    "genre_super": "$genres_doc.genre_super",
                }
            },
            {"$unset": "genres_doc"},
            {'$group': {
                '_id': '$id',
                "genre_super": {'$push': '$genre_super'},
            }},
            {'$unwind': '$genre_super'},
            {'$group': {
                '_id': {'id': "$_id", 'genre_super': '$genre_super'},
                'genre_super_freq': {'$sum': 1},
            }},
            {'$group': {
                '_id': '$_id.id',
                'genre_info': {'$push': {'genre_super': '$_id.genre_super', 'genre_super_freq': '$genre_super_freq'}},
            }}
        ]
        res = list(db[f"{coll_name}_api"].aggregate(pipeline, allowDiskUse=True))
        for doc in res:
            label = sorted(doc['genre_info'], key=lambda k: k['genre_super_freq'])[-1]['genre_super']
            db[f"{coll_name}_api"].update_one({"id": doc['_id']}, {"$set": {"genre_super": label, 'genre_color': label_to_color(label) } } )

    for coll_name in ['genres', 'artists', 'tracks']:
        update_coll_genreclustering(coll_name)
        print(f'Done {coll_name}')
except ValueError:
    print('All gucci you have already got the genres')

from infovis21.mongodb import utils as dbutils
dbutils.add_genre_super_info('genre', 'genre', 'name')
dbutils.add_genre_super_info('artist', 'artist', 'id')