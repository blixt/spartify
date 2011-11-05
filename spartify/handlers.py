from google.appengine.ext.webapp import template
from google.appengine.ext.webapp import RequestHandler


class MainPage(RequestHandler):
    def get(self):
        self.response.out.write(
            template.render('templates/index.html', dict()))

class Queue(RequestHandler):
    def get(self):
        self.response.out.write('meh')
