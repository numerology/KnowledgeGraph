__author__ = 'Jiaxiao Zheng'
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
import webapp2
import operator
from models import *

import jinja2
import os

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),'../templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)

class MainPage(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            self.redirect('/graph')
            return
        else:
            url = users.create_login_url('/')

        template_values = {'login_url':url}
        template = JINJA_ENVIRONMENT.get_template('main.html')

        self.response.write(template.render(template_values))

class GraphHandler(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        user_prof = User.query(User.email == str(user.email())).get()
        if(user_prof):
            template_values = {'user_id':str(user_prof.key.id())}
            template = JINJA_ENVIRONMENT.get_template('index.html')
            self.response.write(template.render(template_values))
            return
        else:
            self.redirect('/createroot')
            return

class CreateRootHandler(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        template_values = {'user_email':str(user.email())}
        template = JINJA_ENVIRONMENT.get_template('create_root.html')
        self.response.write(template.render(template_values))
