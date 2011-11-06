from spartify import handlers

uris = (
    ('/api/(.*)', handlers.SpartifyService),
    ('/.*', handlers.MainPage),
)
