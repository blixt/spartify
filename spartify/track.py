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

    def lookup(self):
        if not self._meta:
            # TODO
            self._meta = True

    def __str__(self):
        return ','.join((self.uri, self.title, self.artist, self.album,))

    def __dict__(self):
        return {
                'uri': self.uri,
                'title': self.title,
                'artist': self.artist,
                'album': self.album,
                }
