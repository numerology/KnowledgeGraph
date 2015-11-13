__author__ = 'Jiaxiao Zheng'

from handlers.webHandlers import *

import webapp2



routes = [
  #  webapp2.Route(r'/api/stream_list', handler = ListStreamHandler, name = 'list_api'),
    webapp2.Route(r'/', handler = MainPage),

]
app = webapp2.WSGIApplication(routes = routes, debug = True)
