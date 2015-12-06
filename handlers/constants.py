__author__ = 'Jiaxiao Zheng'

import jinja2
import os
from googleapiclient import discovery
from oauth2client import appengine
from oauth2client import client
from lib import httplib2
from google.appengine.api import memcache
from models import *

NDB_UPDATE_SLEEP_TIME = 0.3

IN_TYPE_IMG = "int"
IN_TYPE_PDF = "pdf"
EXT_TYPE = "ext"
THUMBNAIL_SIZE = 100
SOCIAL_TIME_WINDOW = 2400 #in minutes

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), '../templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


CLIENT_SECRETS = os.path.join(os.path.dirname(__file__), 'client_secrets.json')

ACTION_QUEUE = Actionqueue.query().fetch()[1]
if ACTION_QUEUE is None:
    ACTION_QUEUE = Actionqueue(actions = [])
    ACTION_QUEUE.put()

MISSING_CLIENT_SECRETS_MESSAGE = """
<h1>Warning: Please configure OAuth 2.0</h1>
<p>
To make this sample run you will need to populate the client_secrets.json file
found at:
</p>
<p>
<code>%s</code>.
</p>
<p>with information found on the <a
href="https://code.google.com/apis/console">APIs Console</a>.
</p>
""" % CLIENT_SECRETS

http = httplib2.Http(memcache)
service = discovery.build("plus", "v1", http=http)
decorator = appengine.oauth2decorator_from_clientsecrets(
    CLIENT_SECRETS,
    # take care about the scope, we need:
    # 1. login authorization
    # 2. Not only access user's profile, but also friends' profiles, so plus.me does not suffice
    scope=['https://www.googleapis.com/auth/plus.login',
           'https://www.googleapis.com/auth/plus.profile.emails.read',
           'https://www.googleapis.com/auth/userinfo.email',
           'https://www.googleapis.com/auth/userinfo.profile',
           'profile'],
    message=MISSING_CLIENT_SECRETS_MESSAGE)
