from spartify.stores import store
from spartify.util import index_of, create_id


USER_REPEAT_VOTE_WAIT = 600
PARTY_EXPIRE_TIMEOUT  = 3600
PARTY_JOIN_TIMEOUT    = 3600


class Queue(object):
    def __init__(self, party_id):
        self._party_id = party_id
        self._load()

    def _load(self):
        try:
            self._queue = store[self._key]
        except KeyError:
            self._queue = []

    def _save(self):
        store.timeout_store(self._key, self._queue, PARTY_EXPIRE_TIMEOUT)

    @property
    def _key(self):
        return 'queue:%s' % (self._party_id,) 
        
    @property
    def next(self):
        try:
            track_uri, votes = self._queue.pop(0)
            self._save()
        except IndexError:
            track_uri = None
        return track_uri

    @property
    def all(self):
        return [track_uri for track_uri, votes in self._queue]
    
    def vote(self, track_uri):
        pos = index_of(self.queue, track_uri, lambda x: x[0])
        if pos is None:
            self._queue.append((track_uri, 1,))
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

class Party(object):
    def __init__(self, id):
        self.id = id
        self._queue = Queue(self.id)

    def next_track(self):
        return self._queue.next

    def get_queue(self):
        return self._queue.all

    def vote(self, user, track_uri):
        user_vote_key = 'vote:%s:%s' % (user, track_uri,)
        if store[user_vote_key] is None:
            self._queue.vote(track_uri)
            store.timeout_store(user_vote_key, 1, USER_REPEAT_VOTE_WAIT)

def exists(party_id):
    key = 'party:%s' % (party_id,)
    return True if key in store else False

def create():
    party_id = create_id()
    key = 'party:%s' % (party_id,)
    store.timeout_store(key, 1, PARTY_JOIN_TIMEOUT)
    return party_id, []

def join(party_id):
    return create_id(), Party(party_id).get_queue()
