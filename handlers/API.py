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
    def get(self):
        #current_user = User.query(User.email == user_email).get()
        #root_node = current_user.root
        node1 = Node(name = 'gradient descent', childrenIDs = [])
        node1.put()
        node2 = Node(name = 'linear progr', childrenIDs = [])
        node2.put()
        node3 = Node(name = 'interior pt', childrenIDs = [])
        node3.put()
        node2.childrenIDs.append(str(node3.key.id()))
        node2.put()
        root_node = Node(name = 'cvx optimization', childrenIDs = [str(node1.key.id()), str(node2.key.id())])
        # the output json has the following format: (it is a dict)
        # {"name": name, "children": list of a dict, where each element has a name and a list of children}
        out_dict = node_collapse(root_node)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(out_dict))

        return