import pickle
from google.appengine.api import memcache


class DataStore:
    def _parse_key(self, key):
        return 'spartify:%s' % (key,)

    def __getitem__(self, key):
        data = memcache.get(self._parse_key(key))
        if data is None:
            raise KeyError
        return pickle.loads(data)

    def __contains__(self, key):
        data = memcache.get(self._parse_key(key))
        return False if data is None else True

    def __setitem__(self, key, value):
        memcache.set(self._parse_key(key), pickle.dumps(value))

    def timeout_store(self, key, value, timeout):
        memcache.set(self._parse_key(key), pickle.dumps(value), timeout) 

store = DataStore()
