__author__ = 'Jiaxiao Zheng'

from handlers.webHandlers import *
from handlers.API import *
import webapp2



routes = [
  #  webapp2.Route(r'/api/stream_list', handler = ListStreamHandler, name = 'list_api'),
    webapp2.Route(r'/', handler = MainPage),
    webapp2.Route(r'/getJSON', handler = ReturnJSON),

    webapp2.Route(r'/api/addChild/<cname:[\s\S-]+>', handler = AddChildHandler)
]
app = webapp2.WSGIApplication(routes = routes, debug = True)
