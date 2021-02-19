from enum import Enum, auto

class CollName(Enum):
    GENRES = auto()
    YEARS = auto()
    TRACKS = auto()
    ARTISTS = auto()

filenames = [
    'data_by_genres',
    'data_by_year',
    'data',
    'data_w_genres',
]

collname_map = {
    CollName.GENRES : 'data_by_genres',
    CollName.YEARS : 'data_by_year',
    CollName.TRACKS : 'data',
    CollName.ARTISTS : 'data_w_genres',
}

