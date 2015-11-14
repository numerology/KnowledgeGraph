__author__ = 'Jiaxiao Zheng'

from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from models import *
import webapp2
import jinja2
import json

def node_collapse(node):
    if (len(node.childrenIDs)==0):
        return {"name": node.name}
    else:
        children = []
        for childID in node.childrenIDs:
            cchild = node.get_by_id(int(childID))
            children.append(node_collapse(cchild))

        return {"name": node.name, "children":children}

class ReturnJSON(webapp2.RequestHandler):
    def get(self, user_email):
        current_user = User.query(User.email == user_email).get()
        root_node = current_user.root
        # the output json has the following format: (it is a dict)
        # {"name": name, "children": list of a dict, where each element has a name and a list of children}
        out_dict = node_collapse(root_node)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(out_dict))

        return