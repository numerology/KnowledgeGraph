__author__ = 'Jiaxiao Zheng'

from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

import webapp2
import jinja2

class ReturnJSON(webapp2.RequestHandler):
    def get(self, user_id):
        
        return