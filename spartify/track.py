import config
from django.utils import simplejson as json
from urllib import quote_plus as quote
from google.appengine.api.urlfetch import fetch


class Track:
    uri = None
    _metadata = {
            'uri': '',
            'title': '',
            'artist': '',
            'album': '',
            'length': '',
            }
    _metadata_set = False

    def __init__(self, uri):
        self.uri = uri
        self._metadata['uri'] = self.uri

    def set_metadata(self, title, artist, album, length):
        self._metadata['title'] = title
        self._metadata['artist'] = artist
        self._metadata['album'] = album
        self._metadata['length'] = length
        self._metadata_set = True

    def lookup(self):
        import logging
        if not self._metadata_set:
            try:
                url = '%slookup/1/.json?uri=%s' % (config.SPOTIFY_BASE_URL,
                        self.uri)
                res = fetch(url)
                res = json.loads(res.content)
                logging.info(str(res))
                res_track = res['track']
                self.set_metadata(
                    res_track['name'],
                    res_track['artists'][0]['name'],
                    res_track['album']['name'],
                    res_track['length'])
            except:
                pass

    def to_dict(self):
        return self._metadata

    def __hash__(self):
        return hash(self.uri)
