from spartify import party, util


def validate(f):
    def wrap(self, party_id, *args, **kwargs):
        if party.exists(party_id):
            return f(self, party_id.upper(), *args, **kwargs)
    return wrap


class API(object):
    def start(self):
        return party.create()

    @validate
    def join(self, party_id):
        return party.join(party_id)

    @validate
    def queue(self, party_id):
        return party.Party(party_id).get_queue()

    @validate
    def pop(self, party_id):
        return party.Party(party_id).pop_track()

    @validate
    def vote(self, party_id, user_id, track_uri):
        return party.Party(party_id).vote(user_id, track_uri)


class SpartifyService(API, util.JsonService):
    pass
