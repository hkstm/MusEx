import dotenv
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth

dotenv.load_dotenv()
spotify = spotipy.Spotify(
    client_credentials_manager=SpotifyClientCredentials(),
    requests_timeout=100,
    retries=5,
    status_retries=5,
)


def get_spotify_track(track_id):
    return spotify.track("spotify:track:" + track_id)
