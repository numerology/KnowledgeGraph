__author__ = 'Jiaxiao Zheng'
from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

import webapp2
import jinja2


class Reference(ndb.Model):
    type = ndb.StringProperty()
    url = ndb.StringProperty()
    blobkey = ndb.BlobKeyProperty()
    adddate = ndb.DateTimeProperty(auto_now_add=True)
    publishdate = ndb.DateTimeProperty()
    description = ndb.StringProperty()


class Node(ndb.Model):
    name = ndb.StringProperty()
    title = ndb.StringProperty()
    definition = ndb.StringProperty()
    tags = ndb.StringProperty(repeated=True)
    childrenIDs = ndb.StringProperty(repeated=True)
    trending = ndb.IntegerProperty(repeated=True)
    reference = ndb.StringProperty(repeated=True)

class Action(ndb.Model):
    plusid = ndb.StringProperty()
    nodeid = ndb.StringProperty()
    lastmodified = ndb.DateTimeProperty(auto_now_add = True)


class User(ndb.Model):
    email = ndb.StringProperty()
    plusid = ndb.StringProperty()
    rootID = ndb.StringProperty(repeated=True)
    sharedID = ndb.StringProperty(repeated=True)
    titles = ndb.StringProperty(repeated=True)
    sharedtitles = ndb.StringProperty(repeated=True)
    currentrootID = ndb.StringProperty()
    clipboardID = ndb.StringProperty()


class Actionqueue(ndb.Model):
    actions = ndb.StructuredProperty(Action,repeated=True)
