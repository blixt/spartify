from cStringIO import StringIO
import inspect
import json
import logging
import string
import random
import re

import webapp2


def create_id(size=12, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def index_of(iterable, value, get_attr=lambda x:x):
    i = 0
    for item in iterable:
        if get_attr(item) == value:
            return i
        i+= 1
    return None


class JsonService(webapp2.RequestHandler):
    """Opens up all attributes that don't start with an underscore to HTTP
    requests using JSON to represent data.

    Note: Arguments that start with an underscore are also ignored. For the call
          to succeed, these arguments must have a default value.
    """
    def _is_public_attr(self, action):
        return (not action.startswith('_') and
                hasattr(self, action))

    def get(self, action):
        out = {'status': 'unknown',
               'response': None}

        if self._is_public_attr(action):
            try:
                args = {}
                for arg in self.request.params:
                    if arg.startswith('_'): continue
                    args[str(arg)] = json.loads(self.request.params[arg])

                attr = getattr(self, action)
                out['status'] = 'success'
                out['response'] = attr(**args) if callable(attr) else attr
            except Exception, e:
                logging.exception('JSON service call %s(**%r) failed:' % (
                    action, args))

                res = {'message': str(e),
                       'module': e.__class__.__module__,
                       'type': e.__class__.__name__}

                if hasattr(e, 'code'):
                    res['code'] = e.code
                if hasattr(e, 'data'):
                    res['data'] = e.data

                out['status'] = 'error'
                out['response'] = res
        else:
            out['status'] = 'list'

            clean = re.compile(r'^[\t ]+|\s+$', re.MULTILINE)
            res = StringIO()
            for a in self.__class__.__dict__:
                if self._is_public_attr(a):
                    attr = getattr(self, a)
                    if not callable(attr):
                        res.write(a)
                        res.write('\n\n')
                        continue

                    args, varargs, varkw, defaults = inspect.getargspec(attr)
                    num_args = len(args)

                    if defaults:
                        diff = num_args - len(defaults)

                    spec = ''
                    for i in xrange(1, num_args):
                        part = (', ' if spec else '') + args[i]
                        if defaults and i >= diff:
                            def_val = json.dumps(defaults[i - diff])
                            part = '[%s=%s]' % (part, def_val)
                        spec += part

                    if varargs: spec += ', *%s' % varargs
                    if varkw: spec += ', **%s' % varkw

                    res.write(a)
                    res.write('(')
                    res.write(spec)
                    res.write(')\n')
                    if attr.__doc__:
                        res.write(clean.sub('', attr.__doc__))
                        res.write('\n\n')
                    else:
                        res.write('\n')

            out['response'] = res.getvalue()
            res.close()

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(out, separators=(',', ':')))

    post = get
