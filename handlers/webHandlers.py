__author__ = 'Jiaxiao Zheng'
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
import webapp2
import operator

import jinja2
import os

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),'../templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainPage(webapp2.RequestHandler):
    def get(self):

        template_values = []
        template = JINJA_ENVIRONMENT.get_template('index.html')

        self.response.write(template.render(template_values))