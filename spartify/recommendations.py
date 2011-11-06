import config
import json
from urllib import quote_plus as quote
from google.appengine.api.urlfetch import fetch


def find_similar_tracks(tracks):
    res_tracks = set()
    similar_artists = find_similar_artists(track.artist for track in tracks)
    url = '%ssong/search?api_key=%s&artist_id=%%s&sort=song_hotttnesss-desc&results=1'\
            % (config.ECHONEST_BASE_URL, ECHONEST_API_KEY,)
    for artist in similar_artists:
        try:
            res = fetch(url % (quote(artist['id']),))
            res = json.loads(res.content)
            res_track = res['response']['songs']
            # what we will lookup on Spotify
            query = 'artist:"%s" %s' % (res_track['artist'], res_track['title'],)
            spotify_url = '%search/1/track.json?q=%s'\
                    % (config.SPOTIFY_BASE_URL, quote(query),)
            res = fetch(spotify_url)
            res = json.loads(res.content)
            res_tracks.add(res['tracks'][0]['href'])
        except:
            pass
    return res_tracks


def find_similar_artists(artists):
    res_artists = set()
    url = '%sartist/similar?api_key=%s&name=%%s&results=3'\
            % (config.ECHONEST_BASE_URL, ECHONEST_API_KEY,)
    for artist in artists:
        res = fetch(url % (quote(artist),))
        res = json.loads(res.content)
        for res_artist in res['response']['artists']:
            res_artists.add(res_artist)
    return res_artist
