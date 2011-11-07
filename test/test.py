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

api.vote(party_id, user_id, 'spotify:track:1bLS4tJdifOlblwmu7ZxQA')
# TODO(blixt): Test that makes sure invalid party id fails.
# TODO(blixt): Test that makes sure invalid user id fails.
# TODO(blixt): Test that makes sure invalid URI fails.

songs = api.queue(party_id)
assert len(songs) == 1,\
       'Incorrect number of songs (%d != 1)' % (len(songs),)

title = songs[0].get('title')
assert title == 'Canon - Primo',\
       'Incorrect song metadata (%r)' % (title,)

api.vote(party_id, user_id, 'spotify:track:5iGVZHnAY0JHBZwumMqOcN')
test_uri_1 = 'spotify:track:4woQ1mc7PzrQ39j0asLJrf'
api.vote(party_id, user_id, test_uri_1)
api.vote(party_id, user_id, test_uri_1)

songs = api.queue(party_id)
assert len(songs) == 3,\
       'Incorrect number of songs (%d != 3)' % (len(songs),)

test_uri_2 = songs[2].get('uri')
assert test_uri_1 == test_uri_2,\
       'Error in queue (%r != %r)' % (test_uri_1, test_uri_2)

# Pop a track to trigger the Echo Nest API fetch.
api.pop(party_id)['title']
songs = api.queue(party_id)
# Pop more tracks to trigger the fetch again.
for i in xrange(len(songs) - 3):
    api.pop(party_id)
songs = api.queue(party_id)

uris = []
for song in songs:
    uri = song['uri']
    assert uri not in uris,\
           'Song appeared twice in queue'
    uris.append(uri)
