import config
import json
from urllib import quote_plus as quote
from google.appengine.api.urlfetch import fetch
from spartify.track import Track


def find_similar_tracks(tracks):
    result = set()
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
            # create track
            res_track = res['tracks'][0]
            track = Track(res_track['href'])
            track.set_metadata(
                res_track['name'],
                res_track['artists'][0]['name'],
                res_track['album']['name'])
            result.add(track)
        except:
            pass
    return result


def find_similar_artists(artists):
    result = set()
    url = '%sartist/similar?api_key=%s&name=%%s&results=3'\
            % (config.ECHONEST_BASE_URL, ECHONEST_API_KEY,)
    for artist in artists:
        res = fetch(url % (quote(artist),))
        res = json.loads(res.content)
        for res_artist in res['response']['artists']:
            result.add(res_artist)
    return result
