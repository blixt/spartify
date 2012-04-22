from spartify import party, util


def validate(f):
    def wrap(self, party_id, *args, **kwargs):
        if party.exists(party_id):
            return f(self, party_id.upper(), *args, **kwargs)
    return wrap


class API(object):
    def start(self, event_id=0):
        party_id, queue, version = party.create(event_id)
        return {
                'id': party_id,
                'queue': queue,
                'version': version,
                'event_id': event_id,
                }

    @validate
    def join(self, party_id):
        guest_id, event_id, (queue, version,) = party.join(party_id)
        return {
                'guest': guest_id,
                'queue': queue,
                'version': version,
                'event_id': event_id,
                }

    @validate
    def queue(self, party_id, version=None):
        result = party.Party(party_id).get_queue(version)
        if result:
            queue, version = result
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

    def find_parties(self, event_ids):
        return party.find(event_ids)


class SpartifyService(API, util.JsonService):
    pass
