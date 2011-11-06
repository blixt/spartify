import config

from spartify.stores import store
from spartify.util import create_id
from spartify.playback import Queue, Played


class Party(object):
    def __init__(self, id):
        self.id = id
        self._queue = Queue(self.id)
        self._played = Played(self.id)

    def pop_track(self):
        track = self._queue.pop()
        self._played.add(track)
        if len(self._queue) < config.PARTY_QUEUE_PANIC:
            # TODO look up stuff on EchoNest
            pass
        return track

    def get_queue(self):
        return self._queue.all

    def get_played(self):
        return self._played.all

    def vote(self, user, track_uri):
        user_vote_key = 'vote:%s:%s' % (user, track_uri,)
        if store[user_vote_key] is None:
            self._queue.vote(track_uri)
            store.timeout_store(user_vote_key, 1, config.USER_REPEAT_VOTE_WAIT)

def exists(party_id):
    key = 'party:%s' % (party_id,)
    return True if key in store else False

def create():
    party_id = create_id()
    key = 'party:%s' % (party_id,)
    store.timeout_store(key, 1, config.PARTY_JOIN_TIMEOUT)
    return party_id, []

def join(party_id):
    return create_id(), Party(party_id).get_queue()
