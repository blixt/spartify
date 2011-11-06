import config
import json
from urllib import quote_plus as quote
from google.appengine.api.urlfetch import fetch


class Track:
    uri = ''
    title = ''
    artist = ''
    album = ''
    _meta = False

    def __init__(self, uri):
        self.uri = uri

    def set_metadata(title, artist, album):
        self.title = title
        self.artist = artist
        self.album = album
        self._meta = True


    def lookup(self):
        if not self._meta:
            try:
                url = '%slookup/1/.json?uri=%s' % (config.SPOTIFY_BASE_URL,
                        self.uri)
                res = fetch(url)
                res = json.loads(res.content)
                res_track = res['track']
                self.set_metadata(
                    res_track['name'],
                    res_track['artists'][0]['name'],
                    res_track['album']['name'])
            except:
                pass

    def __str__(self):
        return ','.join((self.uri, self.title, self.artist, self.album,))

    def to_dict(self):
        return {
                'uri': self.uri,
                'title': self.title,
                'artist': self.artist,
                'album': self.album,
                }
