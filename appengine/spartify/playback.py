from spartify import stores
from spartify.util import index_of
from spartify.track import Track
from time import time


class Queue(object):
    def __init__(self, party_id):
        self._party_id = party_id
        self._load()

    def _load(self):
        try:
            data = stores.queues[self._party_id]
            self.version = data['version']
            self._queue = data['queue']
        except KeyError:
            self.version, self._queue = '0', []

    def _save(self):
        self.version = str(time())
        data = {
                'version': self.version,
                'queue': self._queue,
                }
        stores.queues[self._party_id] = data

    def __len__(self):
        return len(self._queue)

    def add(self, track, votes=0):
        self._queue.append((track, votes,))
        self._save()

    @property
    def all(self):
        return (track for track, votes in self._queue)
 
    def pop(self):
        try:
            track, votes = self._queue.pop(0)
            self._save()
        except IndexError:
            track, votes = None, None
        return track, votes
    
    def vote(self, track_uri):
        pos = index_of(self._queue, track_uri, lambda x: x[0]['uri'])
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
