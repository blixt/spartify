from spartify import party, util


def validate(f):
    def wrap(self, party_id, *args, **kwargs):
        if party.exists(party_id):
            return f(self, party_id.upper(), *args, **kwargs)
    return wrap


class API(object):
    def start(self):
        party_id, queue, version = party.create()
        return {
                'id': party_id,
                'queue': queue,
                'version': version,
                }

    @validate
    def join(self, party_id):
        guest_id, (queue, version,) = party.join(party_id)
        return {
                'guest': guest_id,
                'queue': queue,
                'version': version,
                }

    @validate
    def queue(self, party_id, version=None):
        queue, version = party.Party(party_id).get_queue(version)
        return {
                'queue': queue,
                'version': version,
                }

    @validate
    def pop(self, party_id):
        party.Party(party_id).pop_track()
        return None

    @validate
    def vote(self, party_id, user_id, track_uri):
        party.Party(party_id).vote(user_id, track_uri)
        return None


class SpartifyService(API, util.JsonService):
    pass
