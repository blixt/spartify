import re

from spartify.handlers import API

api = API()

# TODO(blixt): Rewrite the tests below to use a proper unit test framework.

party_id, songs = api.start()
# TODO(blixt): Assert that there are no O/0 in the id.
assert re.match('^[A-Z0-9]{5}$', party_id),\
       'Party id should be 5 uppercase letters and/or numbers, got '\
       '%r' % (party_id,)

user_id, songs = api.join(party_id)
assert user_id,\
       'Did not get a user id'
# TODO(blixt): Test that makes sure invalid party id fails.

api.vote(party_id, user_id, 'spotify:track:6JEK0CvvjDjjMUBFoXShNZ')
# TODO(blixt): Test that makes sure invalid party id fails.
# TODO(blixt): Test that makes sure invalid user id fails.
# TODO(blixt): Test that makes sure invalid URI fails.

songs = api.queue(party_id)
assert len(songs) == 1,\
       'Incorrect number of songs (%d != 1)' % (len(songs),)

title = songs[0].get('title')
assert title == 'Never Gonna Give You Up',\
       'Incorrect song metadata (%r)' % (title,)

api.vote(party_id, user_id, 'spotify:track:10hvuZPLofcO8QyOCDnqkr')
api.vote(party_id, user_id, 'spotify:track:3EB4v3xdTb7zkMUvaksDf6')
api.vote(party_id, user_id, 'spotify:track:6JEK0CvvjDjjMUBFoXShNZ')
test_uri_1 = 'spotify:track:6SAT9ooZzVMGCP4iTf2rKZ'
api.vote(party_id, user_id, test_uri_1)
api.vote(party_id, user_id, test_uri_1)

songs = api.queue(party_id)
assert len(songs) == 4,\
       'Incorrect number of songs (%d != 4)' % (len(songs),)

test_uri_2 = songs[3].get('uri')
assert test_uri_1 == test_uri_2,\
       'Error in queue (%r != %r)' % (test_uri_1, test_uri_2)

api.pop(party_id)

songs = api.queue(party_id)
from pprint import pprint
pprint(songs)
