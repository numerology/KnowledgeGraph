__author__ = 'Jiaxiao Zheng'

from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

from models import *
from constants import *
from datetime import *
from time import sleep as time_sleep

import webapp2
import jinja2
import json
import os

from googleapiclient import discovery
from oauth2client import appengine
from oauth2client import client
from lib import httplib2
from google.appengine.api import memcache


def node_collapse(node):
    '''
    :param node: a Node obj
    :return: formatted dict based on NDB data
    '''
    current_thumbs = []
    for r in node.reference:
        ref = Reference.get_by_id(int(r))
        current_description = ref.description
        if ref.type == IN_TYPE_IMG:
            current_url=images.get_serving_url(ref.blobkey) + '=s' + str(THUMBNAIL_SIZE)
        if ref.type == IN_TYPE_PDF:
            current_url='http://cs.brown.edu/courses/cs015/images/pdf.png'
        if ref.type == EXT_TYPE:
            current_url=r.url
        current_thumbs.append({"url": current_url, "msg": current_description})

    if len(node.childrenIDs) == 0:
        return {"name": node.name, "title": node.title, "id": str(node.key.id()),
                "tags": node.tags, "thumbnails": current_thumbs, 
                "reference": node.reference, "childrenIDs": node.childrenIDs}
    else:
        children = []
        for childID in node.childrenIDs:
            cchild = node.get_by_id(int(childID))
            children.append(node_collapse(cchild))
        return {"name": node.name, "title": node.title, "id": str(node.key.id()),
                "tags": node.tags, "thumbnails": current_thumbs, "children": children, 
                "reference": node.reference, "childrenIDs": node.childrenIDs}


class AddChildHandler(webapp2.RequestHandler):
    def post(self, nodeID):
        child_name = self.request.get('childName')
        cnode = Node.get_by_id(int(nodeID))
        child_node = Node(name=child_name, childrenIDs=[], reference=[])
        child_node.put()

        cnode.childrenIDs.append(str(child_node.key.id()))
        cnode.put()

        user = User.query(User.email == users.get_current_user().email()).get()
        plus_id = user.plusid
        caction = Action(nodeid = str(child_node.key.id()), plusid = plus_id)
        caction.put()

        ACTION_QUEUE.actions.append(caction)
        delete_list = []
        i = 0
        while i < len(ACTION_QUEUE.actions):
            if datetime.now() - ACTION_QUEUE.actions[i].lastmodified > timedelta(minutes = SOCIAL_TIME_WINDOW):
                ACTION_QUEUE.actions.remove(ACTION_QUEUE.actions[i])
            else:
                break

        ACTION_QUEUE.put()


        self.redirect('/')


class AddRoot(webapp2.RequestHandler):
    def post(self, user_id):
        cuser = User.get_by_id(int(user_id))

        plus_id = cuser.plusid
        root_name = self.request.get('root_name')
        title = self.request.get('title')
        new_root = Node(name=root_name, title=title ,childrenIDs=[], reference=[])
        new_root.put()
        cuser.rootID.append(str(new_root.key.id()))
        # cuser.titles.append(title)
        cuser.put()

        caction = Action(nodeid = str(new_root.key.id()), plusid = plus_id)
        caction.put()

        ACTION_QUEUE.actions.append(caction)
        delete_list = []
        i = 0
        while i < len(ACTION_QUEUE.actions):
            if datetime.now() - ACTION_QUEUE.actions[i].lastmodified > timedelta(minutes = SOCIAL_TIME_WINDOW):
                ACTION_QUEUE.actions.remove(ACTION_QUEUE.actions[i])
            else:
                break

        ACTION_QUEUE.put()



        self.redirect('/')


"""class AddTag(webapp2.RequestHandler):
    def post(self, node_name):
        cnode = Node.query(Node.name == node_name).get()
        tagstring = self.request.get('tagString')
        tag_list = tagstring.split(';')
        for tag in tag_list:
            cnode.tags.append(tag)

        cnode.put()
        self.redirect('/')
"""

"""
class UpdateTag(webapp2.RequestHandler):
    def post(self):
        node_name = self.request.get("name")
        new_tags = json.loads(self.request.get("new_tags"))
        # print "updata tag for " + node_name
        # print new_tags
        if not new_tags:
            new_tags = []
        cnode = Node.query(Node.name == node_name).get()
        response = {"status": "success", "message": "added"}
        if cnode:
            # print "node found"
            cnode.tags = new_tags
            cnode.put()
        else:
            response["status"] = "error"
            response["message"] = "Node not found"
        self.response.out.write(json.dumps(response))
"""

"""
class UpdateTitle(webapp2.RequestHandler):
    def post(self):
        node_name = self.request.get("name")
        new_title = self.request.get("new_title")
        response = {"status": "success", "message": "title changed"}
        if not new_title:
            response["status"] = "error"
            response["message"] = "New title is empty"
            print "Update title: empty title"
        else:
            cnode = Node.query(Node.name == node_name).get()
            if cnode:
                print "Updata title: " + new_title
                # TODO: change title here ...
                # cnode.put()
            else: 
                response["status"] = "error"
                response["message"] = "Node not found"
        self.response.write(json.dumps(response))
"""


class UpdateRootList(webapp2.RequestHandler):
    def post(self):
        user_id = int(self.request.get("userID"))
        root_type = self.request.get("type")
        response = {"status": "success", "message": root_type+" root list changed"}
        user = User.get_by_id(user_id)
        if not user:
            response["status"] = "error"
            response["message"] = "User not found"
        else:
            new_my_node_list = json.loads(self.request.get("new_root_list"))
            if root_type == "MY_ROOT":
                user.rootID = new_my_node_list
                if user.currentrootID not in user.rootID:
                    if len(new_my_node_list) == 0:
                        print "update root: current root empty!"
                    user.currentrootID = new_my_node_list[0]
                    print "update root: change current root id"
                user.put()
            elif root_type == "SHARED_ROOT":
                user.sharedID = new_my_node_list
                user.put()
            else:
                response["status"] = "error"
                response["message"] = "Add type not found"
        self.response.write(json.dumps(response))


class UpdateNode(webapp2.RequestHandler):
    def post(self):
        print "update node id: "+self.request.get("nodeID")
        node_id = int(self.request.get("nodeID"))
        response = {"status": "success", "message": "Node changed"}
        cnode = Node.get_by_id(node_id)
        if not cnode:
            response["status"] = "error"
            response["message"] = "Node not found"
        else:
            rqst_args = self.request.arguments()
            if "new_title" in rqst_args:
                new_title = str(self.request.get("new_title"))
                print "new title: " + new_title
                cnode.title = new_title
                response["message"] += " name changed"
            if "new_tag_list" in rqst_args:
                new_tag_list = json.loads(self.request.get("new_tag_list"))
                print "node name: " + cnode.name
                print "new tags: "
                print new_tag_list
                cnode.tags = new_tag_list
                response["message"] += " tag changed"
            if "new_child_list" in rqst_args:
                new_child_list = json.loads(self.request.get("new_child_list"))
                print "new child list: "
                print new_child_list
                cnode.childrenIDs = new_child_list
                response["message"] += " child changed"
            if "new_reference_list" in rqst_args:
                new_reference_list = json.loads(self.request.get("new_reference_list"))
                print "new reference list: "
                print new_reference_list
                cnode.reference = new_reference_list
                response["message"] += " reference changed"
            cnode.put()
        self.response.write(json.dumps(response))


class UpdateClipboard(webapp2.RequestHandler):
    def post(self):
        user_id = int(self.request.get("userID"))
        response = {"status": "success", "message": "Clipboard updated"}
        cuser = User.get_by_id(user_id)
        if not cuser:
            response["status"] = "error"
            response["message"] = "User not found"
        else:
            clip_node = Node.get_by_id(int(cuser.clipboardID))
            rqst_args = self.request.arguments()
            if "new_child_list" in rqst_args:
                new_child_list = json.loads(self.request.get("new_child_list"))
                print "update clipboard node list"
                clip_node.childrenIDs = new_child_list
                response["message"] += " children updated"
            if "new_reference_list" in rqst_args:
                new_reference_list = json.loads(self.request.get("new_reference_list"))
                # print "update clipboard reference list"
                # print clip_node.key.id()
                clip_node.reference = new_reference_list
                response["message"] += " reference updated"
            clip_node.put()
            # user.rootID = new_reference_list
            # user.put()
        self.response.write(json.dumps(response))


class CreateRoot(webapp2.RequestHandler):
    def post(self):
        user_email = self.request.get('user_email')
        root_name = self.request.get('root_name')
        title_name = self.request.get('title_name')
        plus_id = self.request.get('plus_id')
        rt_node = Node(name=root_name, title=title_name, childrenIDs=[], reference=[])
        rt_node.put()
        rtIDlist = [str(rt_node.key.id())]
        # titlelist = [title_name]
        new_clipboard = Node(name="Clipboard", title="Clipboard Title", childrenIDs=[], reference=[])
        new_clipboard.put()
        caction = Action(nodeid = str(rt_node.key.id()), plusid = plus_id)
        caction.put()

        ACTION_QUEUE.actions.append(caction)
        delete_list = []
        i = 0
        while i < len(ACTION_QUEUE.actions):
            if datetime.now() - ACTION_QUEUE.actions[i].lastmodified > timedelta(minutes = SOCIAL_TIME_WINDOW):
                ACTION_QUEUE.actions.remove(ACTION_QUEUE.actions[i])
            else:
                break

        ACTION_QUEUE.put()

        new_user_prof = User(email=user_email, plusid = plus_id , rootID=rtIDlist, currentrootID=rtIDlist[0], clipboardID=str(new_clipboard.key.id()))
        new_user_prof.put()
        time_sleep(NDB_UPDATE_SLEEP_TIME)
        self.redirect('/graph')
        return


class FileUploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
       # try:
            print ("PhotoUploadHandler: upload handler is running")

            print ("PhotoUploadHandler: upload resized")
            node_name = self.request.get("node_name")
            upload = self.get_uploads()[0]
            descriptionstr = self.request.get("description")
            key = upload.key()
            user = User.query(User.email == users.get_current_user().email()).get()
            plus_id = user.plusid


            if(self.request.get("type_name") == "PDF"):
                user_file = Reference(type = IN_TYPE_PDF,
                                   blobkey=upload.key(),description = descriptionstr)

            else:
                user_file = Reference(type = IN_TYPE_IMG,
                                   blobkey=upload.key(), description = descriptionstr)

            user_file.put()
            queried_node = Node.query(Node.name == node_name).get()
            if queried_node:
                queried_node.reference.insert(0,str(user_file.key.id()))

                queried_node.put()

                caction = Action(nodeid = str(queried_node.key.id()), plusid = plus_id)
                caction.put()

                ACTION_QUEUE.actions.append(caction)
                delete_list = []
                i = 0
                while i < len(ACTION_QUEUE.actions):
                    if datetime.now() - ACTION_QUEUE.actions[i].lastmodified > timedelta(minutes = SOCIAL_TIME_WINDOW):
                        ACTION_QUEUE.actions.remove(ACTION_QUEUE.actions[i])
                    else:
                        break

                ACTION_QUEUE.put()

            else:
                print ("PhotoUploadHander: No stream found matching "+node_name)


            #preprocessing, generating thumbnail



            self.redirect('/graph')

       # except:
       #     self.error(500)


class GenerateUploadUrlHandler(webapp2.RequestHandler):
      #
    def get(self, node_name):
        self.response.headers['Content-Type'] = 'text/plain'
        cnode = Node.query(Node.name == node_name).get()
       # bkey = cnode.reference[0].blob_key

        self.response.out.write(json.dumps({'upload_url':'/upload_file'}))


class getPDF(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self, key):
        if not blobstore.get(key):
            self.error(404)
        else:
            self.send_blob(key)


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
    def get(self, user_id):
        current_user = User.get_by_id(int(user_id))
        print(current_user.email)
        root_node = Node.get_by_id(int(current_user.currentrootID))

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


class ReturnRoots(webapp2.RequestHandler):
    def get(self, user_id):
        current_user = User.get_by_id(int(user_id))
        out_list = []
        # return the list of roots, containing the id of root and
        for r in current_user.rootID:
            current_root = Node.get_by_id(int(r))
            pair = {'msg': current_root.title,
                    'rootID': r, 'root_name': current_root.name}
            out_list.append(pair)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps({'root_list':out_list}))
        return


class ReturnShares(webapp2.RequestHandler):
    def get(self, user_id):
        current_user = User.get_by_id(int(user_id))
        out_list = []
        for r in current_user.sharedID:
            current_root = Node.get_by_id(int(r))
            pair = {'msg': current_user.sharedtitles[current_user.sharedID.index(r)], 'rootID':r, 'root_name':current_root.name}
            out_list.append(pair)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps({'shared_list':out_list}))
        return


class ReturnClipboard(webapp2.RequestHandler):
    def get(self, user_id):
        cuser = User.get_by_id(int(user_id))
        print (cuser.key.id())
        print (cuser.clipboardID)
        if cuser:
            root_node = Node.get_by_id(int(cuser.clipboardID))
            out_dict = node_collapse(root_node)
            self.response.headers['Content-Type'] = 'text/plain'
            self.response.out.write(json.dumps(out_dict))
        return


class UpdateRoot(webapp2.RequestHandler):
    def get(self, root_id, user_id):
        root_node = Node.get_by_id(int(root_id))
        cuser = User.get_by_id(int(user_id))
        cuser.currentrootID = root_id
        cuser.put()
        out_dict = node_collapse(root_node)
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(out_dict))

        return


class ShareRoot(webapp2.RequestHandler):
    def post(self,root_id,user_id):
        target_mail = self.request.get("target_mail")
        cuser = User.get_by_id(int(user_id))
        target_user = User.query(User.email == target_mail).get()
        target_user.sharedID.append(root_id)
        target_user.sharedtitles.append(cuser.titles[cuser.rootID.index(root_id)])
        target_user.put()
        self.redirect('/')
        return

"""
class UpdateTag(webapp2.RequestHandler):
    def post(self):
        node_name = self.request.get("name")
        new_tags = json.loads(self.request.get("new_tags"))
        # print "updata tag for " + node_name
        # print new_tags
        if not new_tags:
            new_tags = []
        cnode = Node.query(Node.name == node_name).get()
        response = {"status": "success", "message": "added"}
        if cnode:
            # print "node found"
            cnode.tags = new_tags
            cnode.put()
        else:
            response["status"] = "error"
            response["message"] = "Node not found"
        self.response.out.write(json.dumps(response))
"""
