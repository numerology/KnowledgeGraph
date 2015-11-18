__author__ = 'Jiaxiao Zheng'

from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers
from models import *
from constants import *
from time import sleep as time_sleep

import webapp2
import jinja2
import json

def node_collapse(node):
    '''
    :param node: a Node obj
    :return: formatted dict based on NDB data
    '''
    if len(node.childrenIDs) == 0:
        return {"name": node.name, "tags":node.tags}
    else:
        children = []
        for childID in node.childrenIDs:
            cchild = node.get_by_id(int(childID))
            children.append(node_collapse(cchild))

        return {"name": node.name, "tags":node.tags, "children": children}


class AddChildHandler(webapp2.RequestHandler):
    def post(self, cname):
        child_name = self.request.get('childName')
        cnode = Node.query(Node.name == cname).get()
        child_node = Node(name=child_name, childrenIDs=[])
        child_node.put()

        cnode.childrenIDs.append(str(child_node.key.id()))
        cnode.put()
        self.redirect('/')

class AddTag(webapp2.RequestHandler):
    def post(self, node_name):
        cnode = Node.query(Node.name == node_name).get()
        tagstring = self.request.get('tagString')
        tag_list = tagstring.split(';')
        for tag in tag_list:
            cnode.tags.append(tag)

        cnode.put()
        self.redirect('/')


class CreateRoot(webapp2.RequestHandler):
    def post(self):
        user_email = self.request.get('user_email')
        root_name = self.request.get('root_name')
        rt_node = Node(name = root_name, childrenIDs = [])
        rt_node.put()

        new_user_prof = User(email = user_email, rootID = str(rt_node.key.id()))
        new_user_prof.put()
        time_sleep(NDB_UPDATE_SLEEP_TIME)
        self.redirect('/graph')
        return

class FileUploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
       # try:
            print ("PhotoUploadHandler: upload handler is running")
            upload = self.get_uploads()[0]
            print ("PhotoUploadHandler: upload resized")
            node_name = self.request.get("node_name")

            user_file = Reference(type = IN_TYPE,
                                   blobkey=upload.key())
            user_file.put()
            queried_node = Node.query(Node.name == node_name).get()
            if queried_node:
                queried_node.reference.insert(0,user_file)

                queried_node.put()
            else:
                print ("PhotoUploadHander: No stream found matching "+node_name)
            self.redirect('/graph')
       # except:
       #     self.error(500)

class GenerateUploadUrlHandler(webapp2.RequestHandler):
      #
    def get(self, node_name):
        self.response.headers['Content-Type'] = 'text/plain'
        cnode = Node.query(Node.name == node_name).get()
       # bkey = cnode.reference[0].blob_key

        self.response.out.write(json.dumps({'upload_url':blobstore.create_upload_url('/upload_file')}))

class MiniDeleteFigHandler(webapp2.RequestHandler):
    def get(self, id, fig_key):
        user = users.get_current_user()
        if user is None:
        # go to login page
            print("View Stream Handler: Not logged in")
            self.redirect(users.create_login_page(self.request.uri))
            return


'''
        current_stream = stream.get_by_id(int(id))
        if(not current_stream):
            self.redirect("/error/" + 'Wrong stream or page number')
            return

        flag = False
        if current_stream:
            #delete all the imgs, because they are huge
            for i in current_stream.figures:
                if str(i.blob_key) == fig_key:
                    blobstore.delete(i.blob_key)
                    current_stream.figures.remove(i)
                    flag = True
                    break

        if(not flag):
            self.redirect("/error/" + 'Designated fig does not exist')
            return
        current_stream.num_of_pics -= 1
        current_stream.put()
        time_sleep(NDB_UPDATE_SLEEP_TIME)

        return
'''

class ReturnJSON(webapp2.RequestHandler):
    def get(self,user_id):
        current_user = User.get_by_id(int(user_id))
        print(current_user.email)
        root_node = Node.get_by_id(int(current_user.rootID))
        '''
        cnode_list = Node.query(Node.name=='cvx optimization').fetch()

        if(len(cnode_list)==0):
            node1 = Node(name = 'gradient descent', childrenIDs = [])
            node1.put()
            node2 = Node(name = 'linear progr', childrenIDs = [])
            node2.put()
            node3 = Node(name = 'interior pt', childrenIDs = [])
            node3.put()
            node2.childrenIDs.append(str(node3.key.id()))
            node2.put()
            root_node = Node(name = 'cvx optimization', childrenIDs = [str(node1.key.id()), str(node2.key.id())])
            root_node.put()
        else:
            root_node = Node.query(Node.name=='cvx optimization').get()
        # the output json has the following format: (it is a dict)
        # {"name": name, "children": list of a dict, where each element has a name and a list of children}
        '''


        out_dict = node_collapse(root_node)
        print(out_dict)
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(out_dict))

        return



