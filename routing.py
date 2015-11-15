__author__ = 'Jiaxiao Zheng'

from handlers.webHandlers import *
from handlers.API import *
from handlers.JinjaHandler import *
import webapp2

routes = [
  #  webapp2.Route(r'/api/stream_list', handler = ListStreamHandler, name = 'list_api'),
    webapp2.Route(r'/', handler=MainPage),
    webapp2.Route(r'/getJSON/<user_id:[\w-]+>', handler=ReturnJSON),
    webapp2.Route(r'/graph', handler=GraphHandler),
    webapp2.Route(r'/createroot', handler=CreateRootHandler),

    webapp2.Route(r'/api/addChild/<cname:[\s\S-]+>', handler=AddChildHandler),
    webapp2.Route(r'/api/createroot', handler=CreateRoot),

    # test for Jinja template system
    webapp2.Route(r'/test/jinja', handler=JinjaHandler),
]
app = webapp2.WSGIApplication(routes=routes, debug=True)
