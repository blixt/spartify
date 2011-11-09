import json
from urllib import quote_plus as quote

from google.appengine.api.urlfetch import fetch

import config
from spartify.track import Track

def find_similar_tracks(tracks):
    result = set()
    similar_artists = find_similar_artists(track['artist'] for track in tracks)
    url = '%ssong/search?api_key=%s&artist_id=%%s&sort=song_hotttnesss-desc&results=%s'\
            % (config.ECHONEST_BASE_URL, config.ECHONEST_API_KEY,
                    config.ECHONEST_MAX_TRACKS_PER_ARTIST,)
    for artist_id in similar_artists:
        try:
            res = fetch(url % (quote(artist_id),), deadline=60)
            res = json.loads(res.content)
            res_track = res['response']['songs'][0]
            # what we will lookup on Spotify
            query = 'artist:"%s" %s' % (res_track['artist_name'], res_track['title'],)
            spotify_url = '%ssearch/1/track.json?q=%s'\
                    % (config.SPOTIFY_BASE_URL, quote(query.encode('UTF-8')),)
            res = fetch(spotify_url, deadline=60)
            res = json.loads(res.content)
            if res['tracks']:
                # create track
                res_track = res['tracks'][0]
                track = Track(res_track['href'])
                track.set_metadata(
                    res_track['name'],
                    res_track['artists'][0]['name'],
                    res_track['album']['name'],
                    res_track['length'])
                result.add(track)
        except:
            pass
    return result


def find_similar_artists(artists):
    result = set()
    url = '%sartist/similar?api_key=%s&name=%%s&results=%s'\
            % (config.ECHONEST_BASE_URL,
               config.ECHONEST_API_KEY,
               config.ECHONEST_MAX_SIMILAR_ARTIST,)
    for artist in artists:
        res = fetch(url % (quote(artist),), deadline=60)
        res = json.loads(res.content)
        for res_artist in res['response'].get('artists', ()):
            result.add(res_artist['id'])
    return result
