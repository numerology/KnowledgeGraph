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
    current_url = []
    for r in node.reference:
        if r.type == IN_TYPE_IMG:
            current_url.append(images.get_serving_url(r.blobkey) + '=s' + str(THUMBNAIL_SIZE))
        if r.type == IN_TYPE_PDF:
            return
        if r.type == EXT_TYPE:
            current_url.append(r.url)

    if len(node.childrenIDs) == 0:
        return {"name": node.name, "tags":node.tags, "thumbnails": current_url}
    else:
        children = []
        for childID in node.childrenIDs:
            cchild = node.get_by_id(int(childID))
            children.append(node_collapse(cchild))

        return {"name": node.name, "tags":node.tags, "thumbnails": current_url, "children": children}


class AddChildHandler(webapp2.RequestHandler):
    def post(self, cname):
        child_name = self.request.get('childName')
        cnode = Node.query(Node.name == cname).get()
        child_node = Node(name=child_name, childrenIDs=[])
        child_node.put()

        cnode.childrenIDs.append(str(child_node.key.id()))
        cnode.put()
        self.redirect('/')


class AddRoot(webapp2.RequestHandler):
    def post(self, user_id):
        cuser = User.get_by_id(int(user_id))
        root_name = self.request.get('root_name')
        title = self.request.get('title')
        new_root = Node(name = root_name, childrenIDs = [])
        new_root.put()
        cuser.rootID.append(str(new_root.key.id()))
        cuser.titles.append(title)
        cuser.put()

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
        title_name = self.request.get('title_name')
        rt_node = Node(name = root_name, childrenIDs = [])
        rt_node.put()
        rtIDlist = [str(rt_node.key.id())]
        titlelist = [title_name]
        new_user_prof = User(email = user_email, rootID = rtIDlist, titles = titlelist)
        new_user_prof.put()
        time_sleep(NDB_UPDATE_SLEEP_TIME)
        self.redirect('/graph')
        return


class FileUploadHandler(blobstore_handlers.BlobstoreUploadHandler):
    def post(self):
       # try:
            print ("PhotoUploadHandler: upload handler is running")
            upload = self.get_uploads()[0]
            print(self.get_uploads()[0])
            print ("PhotoUploadHandler: upload resized")
            node_name = self.request.get("node_name")
            if(self.request.get("type_name") == "PDF"):
                user_file = Reference(type = IN_TYPE_PDF,
                                   blobkey=upload.key())
            else:
                user_file = Reference(type = IN_TYPE_IMG,
                                   blobkey=upload.key())
            user_file.put()
            queried_node = Node.query(Node.name == node_name).get()
            if queried_node:
                queried_node.reference.insert(0,user_file)

                queried_node.put()
            else:
                print ("PhotoUploadHander: No stream found matching "+node_name)
            self.redirect('/graph')
            assert(1 == 0)
       # except:
       #     self.error(500)


class GenerateUploadUrlHandler(webapp2.RequestHandler):
      #
    def get(self, node_name):
        self.response.headers['Content-Type'] = 'text/plain'
        cnode = Node.query(Node.name == node_name).get()
       # bkey = cnode.reference[0].blob_key

        self.response.out.write(json.dumps({'upload_url':blobstore.create_upload_url('/upload_file')}))


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
    def get(self,user_id):
        current_user = User.get_by_id(int(user_id))
        print(current_user.email)
        root_node = Node.get_by_id(int(current_user.rootID[0]))
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
            pair = {'msg': current_user.titles[current_user.rootID.index(r)], 'rootID':r , 'root_name':current_root.name}

            out_list.append(pair)

        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps({'root_list':out_list}))
        return

class UpdateRoot(webapp2.RequestHandler):
    def get(self,root_id):
        root_node = Node.get_by_id(int(root_id))

        out_dict = node_collapse(root_node)
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(json.dumps(out_dict))

        return



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
