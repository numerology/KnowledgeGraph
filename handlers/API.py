__author__ = 'Jiaxiao Zheng'

from google.appengine.ext import ndb
from google.appengine.api import users, files, images
from google.appengine.ext import blobstore
from google.appengine.ext.webapp import blobstore_handlers

from models import *
from constants import *
from datetime import *
from time import sleep as time_sleep
from google.appengine.ext.blobstore import BlobKey

import webapp2
import jinja2
import json
import os
import re

from googleapiclient import discovery
from oauth2client import appengine
from oauth2client import client
from lib import httplib2
from google.appengine.api import memcache


def node_collapse(node, default_data={}):
    '''
    :param node: a Node obj
    :return: formatted dict based on NDB data
    '''
    current_thumbs = []
    for r in node.reference:
        ref = Reference.get_by_id(int(r))
        current_description = ref.description
        if ref.type == IN_TYPE_IMG:
            current_url = images.get_serving_url(ref.blobkey) + '=s' + str(THUMBNAIL_SIZE)
        if ref.type == IN_TYPE_PDF:
            current_url = '/img/pdf.png'
            # current_url = 'http://cs.brown.edu/courses/cs015/images/pdf.png'
        if ref.type == EXT_TYPE:
            current_url = r.url
        current_thumbs.append({"url": current_url, "msg": current_description, "blob":str(ref.blobkey), "id":r})

    result = {"name": node.name, "label": node.name, "title": node.title, "id": str(node.key.id()),
              "tags": node.tags, "thumbnails": current_thumbs,
              "reference": node.reference, "childrenIDs": node.childrenIDs}
    result.update(default_data.copy())

    if len(node.childrenIDs) > 0:
        children = []
        for childID in node.childrenIDs:
            cchild = node.get_by_id(int(childID))
            children.append(node_collapse(cchild, default_data))
        result["children"] = children
    return result


def node_deep_copy(target_node):

    result = Node(name = target_node.name,
                  title = target_node.title,
                  definition = target_node.definition,
                  tags = target_node.tags, #TODO: check the copy of array is shallow or deep
                  childrenIDs = [],
                  reference = target_node.reference) #Since users are not allowed to delete or edit a reference item,


                                                    # i think it is okay to do shallow copy here
    for c in target_node.childrenIDs:
        child = Node.get_by_id(int(c))
        new_child = node_deep_copy(child)
        result.childrenIDs.append(str(new_child.key.id()))


    result.put()


    return result



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

        # self.redirect('/')
        response = {"status":"success",
                    "message": (child_node.name + " added to " + cnode.name),
                    "new_node": node_collapse(cnode)}
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(response))
        return


class AddRoot(webapp2.RequestHandler):
    def post(self, user_id):
        print "ADD ROOT"
        root_name = self.request.get('root_name')
        title = self.request.get('title_name')

        print "AddRoot: "+root_name+" title: " + title

        cuser = User.get_by_id(int(user_id))

        plus_id = cuser.plusid
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

        response = {"status":"success", "message": root_name+" created"}
        self.response.out.write(json.dumps(response))
        # self.redirect('/')
        return


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
                    response["current_root_changed"] = True
                user.put()
            elif root_type == "SHARED_ROOT":
                user.sharedID = new_my_node_list
                user.put()
            else:
                response["status"] = "error"
                response["message"] = "Add type not found"
        self.response.out.write(json.dumps(response))


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
        self.response.out.write(json.dumps(response))


class UpdateClipboard(webapp2.RequestHandler):
    def post(self):
        print self.request.get("userID")
        print int(self.request.get("userID"))
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
        self.response.out.write(json.dumps(response))


class UpdateClipboardSocial(webapp2.RequestHandler):
    def post(self):
        # Idea: All the nodes updated in this operation should be deep copied

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
                for id in new_child_list:
                    if id in clip_node.childrenIDs:
                        continue
                    else:
                        # do a deep copy and put new id into childrenIDs
                        target_node = Node.get_by_id(int(cuser.clipboardID))
                        new_node = node_deep_copy(target_node)

                id = new_child_list[-1]
                target_node = Node.get_by_id(int(id))
                new_node = node_deep_copy(target_node)


                clip_node.childrenIDs.append(str(new_node.key.id()))
                response["message"] += " children updated"
            '''
                # DO not need reference stuff
            if "new_reference_list" in rqst_args:
                new_reference_list = json.loads(self.request.get("new_reference_list"))
                # print "update clipboard reference list"
                # print clip_node.key.id()
                clip_node.reference = new_reference_list
                response["message"] += " reference updated"
            '''
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
        new_clipboard = Node(name="Clipboard", title="Clipboard", childrenIDs=[], reference=[])
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


class DeleteRefHandler(webapp2.RequestHandler):
    def post(self):
        ref_id = self.request.get("ref_ID")
        node_id = self.request.get("node_ID")
        cRef = Reference.get_by_id(int(ref_id))
        cNode = Node.get_by_id(int(node_id))

        blobstore.delete(cRef.blobkey)
        cNode.reference.remove(ref_id)
        cNode.put()
        self.redirect('/')



class FileUploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
       # try:
            print ("PhotoUploadHandler: upload handler is running")

            print ("PhotoUploadHandler: upload resized")

            upload = self.get_uploads()[0]
            node_id = self.request.get("node_ID")
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
            queried_node = Node.get_by_id(int(node_id))
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
                print ("PhotoUploadHander: No node found matching "+node_id)


            #preprocessing, generating thumbnail



            self.redirect('/graph')

       # except:
       #     self.error(500)


class GenerateUploadUrlHandler(webapp2.RequestHandler):
      #
    def get(self, node_id):
        self.response.headers['Content-Type'] = 'text/plain'
        cnode = Node.get_by_id(int(node_id))
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


class RefreshHandler(webapp2.RequestHandler):
    def get(self, node_id):
        cnode = Node.get_by_id(int(node_id))
        ref_list = []
        for sref in cnode.reference:
            ref = Reference.get_by_id(int(sref))
            if ref.type == IN_TYPE_IMG:
                current_url=images.get_serving_url(ref.blobkey) + '=s' + str(THUMBNAIL_SIZE)
            elif ref.type == IN_TYPE_PDF:
                current_url='http://cs.brown.edu/courses/cs015/images/pdf.png'
            else:
                current_url=ref.url

            ref_list.append({'description':ref.description,
                             'url':current_url})

        template_values = {'name':cnode.name,
                           'tags':cnode.tags,
                           'def':cnode.definition,
                           'refs':ref_list}
        template = JINJA_ENVIRONMENT.get_template('content.html')
        self.response.write(template.render(template_values))


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


class ReturnIndexData(webapp2.RequestHandler): # return all the nodes for index view
    def get(self,user_id):
        response = {'status':"success", "message": "get index nodes succeed"}
        current_user = User.get_by_id(int(user_id))
        if not current_user:
            response["status"] = "error"
            response["message"] = "user not found"
        else:
            response['myNode'] = []
            response['sharedNode'] = []
            for root_id in current_user.rootID:
                root_node = Node.get_by_id(int(root_id))
                response['myNode'].append(node_collapse(root_node))
            for root_id in current_user.sharedID:
                root_node = Node.get_by_id(int(root_id))
                temp_data = node_collapse(root_node, {"is_shared": True})
                response["sharedNode"].append(temp_data)
            clipboard_data = node_collapse(Node.get_by_id(int(current_user.clipboardID)))
            clipboard_data["is_clipboard"] = True
            clipboard_data["label"] = "Clipboard"
            response["clipboard"] = clipboard_data
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(response))
        return


class ReturnActions(webapp2.RequestHandler):
    @decorator.oauth_required
    def get(self, user_id):
        user_prof = User.get_by_id(int(user_id))

        http = decorator.http()

        user = service.people().list(userId = 'me', collection = 'visible')
     # text = 'Hello, %s!' % user['displayName']
        result = user.execute(http)
        friend_name = {}
        friend_fig = {}

        for i in result['items']:
            f = User.query(User.plusid == i['id']).get()
            if(f is not None):
                friend_name[(f.plusid)] = i['displayName']
                friend_fig[(f.plusid)] = i['image']['url']

        output_actions = []
        for a in ACTION_QUEUE.actions:
            if a.plusid in friend_name.keys():
                cnode = Node.get_by_id(int(a.nodeid))

                output_actions.append({'node_name': cnode.name,
                                       'node_id': a.nodeid,
                                       'user_name': friend_name[a.plusid],
                                       'plusID':a.plusid,
                                       'user_figure':friend_fig[a.plusid],
                                       'time':str(a.lastmodified)})

      #dict = json.loads(str(user))
   #   names = ''
  #    for i in result['items']:
  #        names = names + ' ' + i['displayName']

 #     result = service.people().get(userId = result['items'][0]['id']).execute(http)

    #  text = names
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(output_actions))

class ReturnIndividualActions(webapp2.RequestHandler):
    @decorator.oauth_required
    def get(self, user_id, target_plus_id):
        user_prof = User.get_by_id(int(user_id))

        http = decorator.http()

        user = service.people().get(userId = target_plus_id)
     # text = 'Hello, %s!' % user['displayName']
        result = user.execute(http)


        output_actions = []
        for a in ACTION_QUEUE.actions:
            if a.plusid == target_plus_id:
                cnode = Node.get_by_id(int(a.nodeid))

                output_actions.append({'node_name': cnode.name,
                                       'node_id': a.nodeid,
                                       'user_name': result['displayName'],
                                       'user_figure':result['image']['url'],
                                       'time':str(a.lastmodified)})

      #dict = json.loads(str(user))
   #   names = ''
  #    for i in result['items']:
  #        names = names + ' ' + i['displayName']

 #     result = service.people().get(userId = result['items'][0]['id']).execute(http)

    #  text = names
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(output_actions))

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


class ReturnSharedNodes(webapp2.RequestHandler):
    def get(self, user_id):
        current_user = User.get_by_id(int(user_id))
        out_list = []
        for r in current_user.sharedID:
            current_root = Node.get_by_id(int(r))
            temp_msg = current_root.title
            if not temp_msg:
                temp_msg = current_root.name
            pair = {'msg': temp_msg, 'rootID': r, 'root_name':current_root.name}
            out_list.append(pair)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps({'shared_list': out_list}))
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


class ServeReference(blobstore_handlers.BlobstoreDownloadHandler):
    def get(self,blobkey):
        key = BlobKey(blobkey)
        '''
        if not blobstore.get(key):
            self.error(404)
        else:
        '''
        self.send_blob(key)


class ShareRoot(webapp2.RequestHandler):
    def post(self, root_id, user_id):
        mail_string = self.request.get("target_email")
        share_message = self.request.get("share_message") # TODO: can somehow use share message
        mail_list = parseEmailString(mail_string)
        print("mailstring is "+ str(mail_list))
        cuser = User.get_by_id(int(user_id))
        # print "Share Root"
        # print mail_list
        response = {"status": "success",
                    "message": "node shared to"}
        shared_num = 0
        for target_mail in mail_list:
            print(target_mail[:-1])
            target_user = User.query(User.email == str(target_mail[:-1])).get()
            if target_user:
                target_user.sharedID.append(root_id)
         #       target_user.sharedtitles.append(cuser.titles[cuser.rootID.index(root_id)])
                target_user.put()
                shared_num  = shared_num+1
        response["message"] = response["message"] + " " + str(shared_num) + " users"
        # self.redirect(self.request.uri)
        self.response.out.write(json.dumps(response))
    #    assert(1==0)
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


class CopyToNode(webapp2.RequestHandler):
    def post(self):
        response = {'status': "error", "message": "ERROR"}
        user_id = self.request.get("userID")
        copied_node_id = self.request.get("copiedNodeID")
        target_node_id = self.request.get("targetNodeID")
        if not user_id:
            response["message"] = "No user id sent to server"
        elif not copied_node_id:
            response["message"] = "No copy node id sent to server"
        elif not target_node_id:
            response["message"] = "No target node id sent to server"
        elif copied_node_id == target_node_id:
            response["message"] = "Cannot copy node to itself"
        else:
            current_user = User.get_by_id(int(user_id))
            copied_node = Node.get_by_id(int(copied_node_id))
            target_node = Node.get_by_id(int(target_node_id))
            if not current_user:
                response["message"] = "Fail to find user"
            elif not copied_node:
                response["message"] = "Fail to find copied node"
            elif not target_node:
                response["message"] = "Fail to find target node"
            else:
                new_copied_node = node_deep_copy(copied_node)
                new_copied_node.put()
                target_node.childrenIDs.append(str(new_copied_node.key.id()))
                response["message"] = "success"
                response["message"] = "Copy " + new_copied_node.name + " to " + target_node.name
        self.response.out.write(json.dumps(response))
        return


def parseEmailString(mail_string):
    mail_list = filter(None, mail_string.split(r'[,;]'))
    return mail_list