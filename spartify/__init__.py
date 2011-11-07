import webapp2

from spartify import handlers

app = webapp2.WSGIApplication([
    ('/api/(.*)', handlers.SpartifyService),
])
