
from pymongo import MongoClient
from .CollName import CollName, collname_map, filenames
import pandas as pd
import ast

client = MongoClient('mongodb://root:example@localhost:27017/')
db = client['kaggle']

def load_kaggle_csvs_into_mongodb():
    csv_paths = [f'../data/kaggle/{filename}.csv' for filename in filenames]

    df_list = [pd.read_csv(path) for path in csv_paths]

    for i, df in enumerate(df_list):
        if 'id' in df: 
            df = df.drop_duplicates(subset=['id'])

    df_list[2] = df_list[2].apply(lambda x: ast.literal_eval(x))  # Artists is supposed to be a list in this csv
    [db[filename].drop() for filename in filenames]  # make sure collections in mongo are empty before inserting
    # insert documents corresponding to csv in mongodb
    [db[filename].insert_many(df_list[idx].to_dict('records')) for idx, filename in enumerate(filenames)]

def get_from_mongo(collection_name, pipeline):
    try:
        collection = db[collname_map[collection_name]]
    except KeyError:
        print(f"No collection found for collection_name. Please make sure that you're using CollName enums as collection_name's e.g. {list(CollName)}")
    return list(collection.aggregate(list(pipeline)))  # pipeline is a tuple until now

# to make things immutable for easier debugging and more intuitive default arg wise pipeline is a tuple
def get_collection(collection_name, pipeline=()):
    pipeline += (
        { '$unset': ['_id'] },  # <- this comma is the easiest way (I think) to make sure that what you're adding to the pipeline is a tuple as well
    )
    return get_from_mongo(collection_name, pipeline)

def single_to_list(x): return [x] if not isinstance(x, list) else x

def get_tracks_by_ids(track_ids, pipeline=()):
    track_ids = single_to_list(track_ids)
    pipeline += (
        { '$match': { 'id': {'$in': track_ids}} },
    )
    return get_collection(CollName.TRACKS, pipeline)

def get_tracks_by_names(track_names, pipeline=()):
    track_names = single_to_list(track_names)
    pipeline += (
        { '$match': { 'name': {'$in': track_names}} },
    )
    return get_collection(CollName.TRACKS, pipeline)
