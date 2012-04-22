import json
from urllib import quote_plus as quote

from google.appengine.api.urlfetch import fetch

import config


class Track:
    uri = None
    title = ''
    artist = ''
    album = ''
    length = ''
    _metadata_set = False

    def __init__(self, uri):
        self.uri = uri

    def set_metadata(self, title, artist, album, length):
        self.title = title
        self.artist = artist
        self.album = album
        self.length = length
        self._metadata_set = True

    def lookup(self):
        if not self._metadata_set:
            try:
                url = '%slookup/1/.json?uri=%s' % (config.SPOTIFY_BASE_URL,
                        self.uri)
                res = fetch(url)
                res = json.loads(res.content)
                res_track = res['track']
                self.set_metadata(
                    res_track['name'],
                    res_track['artists'][0]['name'],
                    res_track['album']['name'],
                    res_track['length'])
            except:
                pass

    def to_dict(self):
        return {
                'uri': self.uri,
                'title': self.title,
                'artist': self.artist,
                'album': self.album,
                'length': self.length,
                }

    def __hash__(self):
        return hash(self.uri)
