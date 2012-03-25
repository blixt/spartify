import config

from spartify.stores import store
from spartify.util import create_id
from spartify.recommendations import find_similar_tracks
from spartify.playback import Queue, Played


class Party(object):
    def __init__(self, id):
        self.id = id
        self._queue = Queue(self.id)
        self._played = Played(self.id)

    def pop_track(self):
        track, votes = self._queue.pop()
        if not track:
            # queue is empty, should never happen...
            return None
        self._played.add(track, votes)
        if len(self._queue) < config.PARTY_QUEUE_PANIC:
            for t in find_similar_tracks(self._queue.all):
                # add simillar track to queue, no votes.
                self._queue.add(t.to_dict(), 0)
        return track

    def get_queue(self, version=None):
        if version and not version < self._queue.version:
            # No changes to the queue
            return
        return [x for x in self._queue.all], self._queue.version

    def get_played(self):
        if version and not version < self._played.version:
            # No changes to the queue
            return
        return [x for x in self._played.all], self._played.version

    def vote(self, user, track_uri):
        user_vote_key = 'vote:%s:%s' % (user, track_uri,)
        if user_vote_key not in store:
            self._queue.vote(track_uri)
            store.timeout_store(user_vote_key, 1, config.USER_REPEAT_VOTE_WAIT)

def exists(party_id):
    key = 'party:%s' % (party_id,)
    return True if key in store else False

def create():
    party_id = create_id(size=5)
    key = 'party:%s' % (party_id,)
    store.timeout_store(key, 1, config.PARTY_JOIN_TIMEOUT)
    return party_id, [], '0'

def join(party_id):
    return create_id(), Party(party_id).get_queue()
