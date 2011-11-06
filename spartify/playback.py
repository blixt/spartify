import config

from spartify.stores import store
from spartify.util import index_of


class BaseQueue(object):
    def __init__(self, party_id):
        self._party_id = party_id
        self._load()

    def _load(self):
        try:
            self._queue = store[self._key]
        except KeyError:
            self._queue = []

    def _save(self):
        store.timeout_store(self._key, self._queue, config.PARTY_EXPIRE_TIMEOUT)

    def __len__(self):
        return len(self._queue)

    @property
    def _key(self):
        raise NotImplementedError
        
    def add(self, track):
        try:
            track, votes = self._queue.pop(0)
            self._save()
        except IndexError:
            track = None
        return track or None

    @property
    def all(self):
        return [str(track) for track, votes in self._queue]
 

class Queue(BaseQueue):
    @property
    def _key(self):
        return 'queue:%s' % (self._party_id,) 
        
    def pop(self):
        try:
            track, votes = self._queue.pop(0)
            self._save()
        except IndexError:
            track = None
        return track or None
    
    def vote(self, track_uri):
        pos = index_of(self.queue, track_uri, lambda x: x[0].uri)
        if pos is None:
            new_track = Track(track_uri)
            # it's ok to lookup now since voting doesn't require prompt action
            new_track.lookup()
            self._queue.append((new_track, 1,))
        elif pos > 0:
            track_uri, votes = self._queue.pop(pos)
            votes+= 1
            while pos > 1:
                if votes > self._queue[pos-1][1]:
                    pos-= 1
                else:
                    break
            self._queue.insert(pos, (track_uri, votes,))
        self._save()


class Played(BaseQueue):
    @property
    def _key(self):
        return 'played:%s' % (self._party_id,) 
        
    def add(self, track):
        self._queue.append(track)
        self._save()


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
