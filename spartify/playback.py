import config

from spartify.stores import store
from spartify.util import index_of
from spartify.track import Track


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
            track = Track(track_uri)
            # it's ok to lookup now since voting doesn't require prompt action
            track.lookup()
            votes = 0
            pos = len(self._queue)
        elif pos > 0:
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
