
from pymongo import MongoClient
import pandas as pd
import ast

client = MongoClient('mongodb://root:example@localhost:27017/')
db = client['kaggle']

filenames = [
    # 'data_by_artist', w_genres contains same data but 'with genre'
    'data_by_genres',
    'data_by_year',
    'data',
    'data_w_genres',
]

def load_kaggle_csvs_into_mongodb():
    csv_paths = [f'../data/kaggle/{filename}.csv' for filename in filenames]

    df_list = [pd.read_csv(path) for path in csv_paths]

    for i, df in enumerate(df_list):
        if 'id' in df: 
            df = df.drop_duplicates(subset=['id'])

    df_by_genres = df_list[0]
    df_by_year = df_list[1]
    df = df_list[2]
    df['artists'] = df['artists'].apply(lambda x: ast.literal_eval(x))  # Artists is supposed to be a list in this csv
    df_w_genres = df_list[3]

    [db[filename].drop() for filename in filenames]

    db['data'].insert_many(df.to_dict('records'))
    db['data_by_genres'].insert_many(df_by_genres.to_dict('records'))
    db['data_by_year'].insert_many(df_by_year.to_dict('records'))
    db['data_w_genres'].insert_many(df_w_genres.to_dict('records'))


def get_collection(name):
    return list(db[name].aggregate([
        { '$unset': ['_id'] },
    ]))