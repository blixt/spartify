import config

from spartify.stores import store
from spartify.util import index_of
from spartify.track import Track
from time import time


class BaseQueue(object):
    def __init__(self, party_id):
        self._party_id = party_id
        self._load()

    def _load(self):
        try:
            data = store[self._key]
            if type(data) is dict:
                self.version = data['version']
                self._queue = data['queue']
            else:
               # backwards compatible...
               self.version, self._queue = '0', data
        except KeyError:
            self.version, self._queue = '0', []

    def _save(self):
        self.version = str(time())
        data = {
                'version': self.version,
                'queue': self._queue,
                }
        store.timeout_store(self._key, data, config.PARTY_EXPIRE_TIMEOUT)

    def __len__(self):
        return len(self._queue)

    @property
    def _key(self):
        raise NotImplementedError
        
    def add(self, track, votes=0):
        self._queue.append((track, votes,))
        self._save()

    @property
    def all(self):
        return (track for track, votes in self._queue)
 

class Queue(BaseQueue):
    @property
    def _key(self):
        return 'queue:%s' % (self._party_id,) 
        
    def pop(self):
        try:
            track, votes = self._queue.pop(0)
            self._save()
        except IndexError:
            track, votes = None, None
        return track, votes
    
    def vote(self, track_uri):
        pos = index_of(self._queue, track_uri, lambda x: x[0].uri)
        if pos is None:
            # new track
            track = Track(track_uri)
            # it's ok to lookup now since voting doesn't require prompt action
            track.lookup()
            # Remove Track if not needed
            track = track.to_dict()
            votes = 0
            pos = len(self._queue)
        else:
            track, votes = self._queue.pop(pos)
        votes+= 1
        while pos > 1:
            if votes > self._queue[pos-1][1]:
                pos-= 1
            else:
                break
        self._queue.insert(pos, (track, votes,))
        self._save()


class Played(BaseQueue):
    @property
    def _key(self):
        return 'played:%s' % (self._party_id,) 
