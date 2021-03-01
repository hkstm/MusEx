from enum import Enum, auto
import numpy as np


class AggregationType(Enum):
    MEAN = auto()


class User:

    def __init__(self, aggr_type=AggregationType.MEAN):
        self.track_attr_log = []
        self.aggr_type = aggr_type

    def update_track_attr_log(self, track):
        self.track_attr_log.append(track.attr_dict)

    def get_optimal_track_pref(self, last=None):
        if not last: last = len(self.track_attr_log)
        if self.aggr_type == AggregationType.MEAN:
            aggregate_keys = [
                'acousticness',
                'danceability',
                'duration_ms',
                'energy',
                'explicit',
                'instrumentalness',
                'key',
                'liveness',
                'loudness',
                'mode',
                'popularity',
                'speechiness',
                'tempo',
                'valence',
                'year',
            ]
            return list(map(np.mean, list(list(zip(*map(lambda x:[x[key] for key in aggregate_keys], self.track_attr_log[-last:]))))))
            