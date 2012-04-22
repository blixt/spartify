import json
import config
from google.appengine.api import memcache
from google.appengine.ext import db


class AsyncValue:
    def __init__(self, deferred):
        self._deferred = deferred

    def __str__(self):
        model = self._deferred.get_result()
        if model is None:
            raise KeyError
        return model.value


class StoreNode(db.Model):
    value = db.StringProperty()
    # These aren't readable just yet
    collection = db.StringProperty()
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)

    @classmethod
    def get(cls, key, async=True):
        if async:
            return AsyncValue(db.get_async(key))
        else:
            model = cls.get_by_key_name(key)
            if model is None:
                raise KeyError
            return model.value

    @classmethod
    def delete(cls, key, async=True):
        if async:
            db.delete_async(key)
        else:
            db.delete(key)

    @classmethod
    def set(cls, key, value, collection, async=True):
        model = cls(key_name=key, value=value, collection=collection)
        if async:
            db.put_async(model)
        else:
            model.put()


class DataStore:
    def __init__(self, collection, persistent=True):
        self._collection = collection
        self._base_key = 'spartify:%s:%%s' % (self._collection,)
        self._persistent = persistent

    def _parse_key(self, key):
        return self._base_key % (key,)

    def __getitem__(self, key):
        key = self._parse_key(key)
        data = memcache.get(key)
        if data is None:
            try:
               data = StoreNode.get(key, async=False)
               memcache.set(key, data, config.CACHE_DEFAULT_TIMEOUT)
            except KeyError:
               raise KeyError
        return json.loads(data)

    def __contains__(self, key):
        key = self._parse_key(key)
        if memcache.get(key) is None:
            try:
               StoreNode.get(key, async=False)
            except KeyError:
               return False
        return True

    def __setitem__(self, key, value):
        self.timeout_store(key, value)

    def timeout_store(self, key, value, timeout=-1):
        key = self._parse_key(key)
        value = json.dumps(value)
        timeout = config.CACHE_DEFAULT_TIMEOUT if timeout < 0 else timeout
        memcache.set(key, value, timeout) 
        if self._persistent:
            StoreNode.set(key, value, self._collection)


votes = DataStore('vote', False)
parties = DataStore('party') 
events = DataStore('events') 
queues = DataStore('queue') 
