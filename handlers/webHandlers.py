__author__ = 'Jiaxiao Zheng'
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
import webapp2
import operator
from models import *
from constants import JINJA_ENVIRONMENT
from API import *

import jinja2
import os


class MainPage(webapp2.RequestHandler):
    @decorator.oauth_aware
    def get(self):
        user = users.get_current_user()
        if user:
            self.redirect('/graph')
            return
        else:
            url = users.create_login_url(decorator.authorize_url())

        template_values = {'login_url': url}
        template = JINJA_ENVIRONMENT.get_template('main.html')

        self.response.write(template.render(template_values))


class GraphHandler(webapp2.RequestHandler):

    def get(self):
        user = users.get_current_user()
        user_prof = User.query(User.email == str(user.email())).get()
      #  upload_url = blobstore.create_upload_url('/upload_file')
        #switch to cloudinary
        upload_url = ('/upload_file')
        if(user_prof):
            template_values = {'user_id': str(user_prof.key.id()), 'upload_url': str(upload_url), 'logout_url': users.create_logout_url("/")}
            template = JINJA_ENVIRONMENT.get_template('home.html')
            self.response.write(template.render(template_values))
            return
        else:
            self.redirect('/createroot')
            return


class CreateRootHandler(webapp2.RequestHandler):
    @decorator.oauth_required
    def get(self):
        user = users.get_current_user()
        http = decorator.http()
        user_plus_profile = service.people().get(userId = 'me').execute(http)

        template_values = {'user_email': str(user.email()),
                           'user_plus_id': user_plus_profile['id']}

        template = JINJA_ENVIRONMENT.get_template('create_root.html')
        self.response.write(template.render(template_values))




class SocialHandler(webapp2.RequestHandler):

  @decorator.oauth_required
  def get(self):
    try:
      http = decorator.http()

      user = service.people().list(userId = 'me', collection = 'visible')
     # text = 'Hello, %s!' % user['displayName']
      result = user.execute(http)

      names = ''
      for i in result['items']:
          f = User.query(User.plusid == i['id']).get()
          if(f is not None):
            names = names + ' ' + i['displayName']

      #dict = json.loads(str(user))
   #   names = ''
  #    for i in result['items']:
  #        names = names + ' ' + i['displayName']

 #     result = service.people().get(userId = result['items'][0]['id']).execute(http)

    #  text = names
      template = JINJA_ENVIRONMENT.get_template('welcome.html')
      self.response.write(template.render({'text': names}))

    except client.AccessTokenRefreshError:
      self.redirect('/')