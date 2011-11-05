from google.appengine.ext.webapp import WSGIApplication
from google.appengine.ext.webapp.util import run_wsgi_app
from spartify import uris


application = WSGIApplication(uris, debug=True)

if __name__ == "__main__":
    run_wsgi_app(application)
