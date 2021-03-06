__author__ = 'Jiaxiao Zheng'

from handlers.webHandlers import *
from handlers.API import *
from handlers.JinjaHandler import *
import webapp2

routes = [
  #  webapp2.Route(r'/api/stream_list', handler = ListStreamHandler, name = 'list_api'),
    webapp2.Route(r'/', handler=MainPage),
    webapp2.Route(r'/get_rooted_data/<user_id:[\w-]+>', handler=ReturnJSON),
    webapp2.Route(r'/get_root_list/<user_id:[\w-]+>', handler=ReturnRoots),
    webapp2.Route(r'/get_shared_list/<user_id:[\w-]+>', handler=ReturnSharedNodes),
    webapp2.Route(r'/get_clipboard/<user_id:[\w-]+>', handler=ReturnClipboard),
    webapp2.Route(r'/get_action_list/<user_id:[\w-]+>', handler=ReturnActions),
    webapp2.Route(r'/get_individual_action_list/<user_id:[\w-]+>/<target_plus_id:[\w-]+>', handler=ReturnIndividualActions),
    webapp2.Route(r'/get_index_data/<user_id:[\w-]+>', handler=ReturnIndexData),
    webapp2.Route(r'/serve_reference/<blobkey:[\s\S-]+>', handler=ServeReference),

    webapp2.Route(r'/graph', handler=GraphHandler),
    webapp2.Route(r'/createroot', handler=CreateRootHandler),
    webapp2.Route(r'/addroot/<user_id:[\w-]+>', handler = AddRoot),
    webapp2.Route(r'/update_rooted_data/<root_id:[\w-]+>/<user_id:[\w-]+>', handler = UpdateRoot),
    webapp2.Route(r'/shareroot/<root_id:[\w-]+>/<user_id:[\w-]+>', handler = ShareRoot),
    webapp2.Route(r'/delete_ref', handler = DeleteRefHandler),
    webapp2.Route(r'/update_ref', handler = UpdateRefHandler),

    webapp2.Route(r'/api/addChild/<nodeID:[\s\S-]+>', handler=AddChildHandler),
    webapp2.Route(r'/api/createroot', handler=CreateRoot),
    # webapp2.Route(r'/api/addtag/<node_name:[\s\S-]+>', handler = AddTag),
    webapp2.Route(r'/api/delete_fig_partial/<id:[\w-]+>/<fig_key:[\S-]+>', handler = MiniDeleteFigHandler, name = 'delete_api'),
    webapp2.Route(r'/api/copy_to_node', handler=CopyToNode),

    webapp2.Route(r'/generate_upload_url/<node_id:[\s\S-]+>', handler=GenerateUploadUrlHandler),
    webapp2.Route(r'/upload_file', handler=FileUploadHandler),
    webapp2.Route(r'/getpdf/([^/]+)?', handler=getPDF),
    # webapp2.Route(r'/api/update_tag', handler=UpdateTag),
    # webapp2.Route(r'/api/update_title', handler=UpdateTitle),
    webapp2.Route(r'/api/update_root', handler=UpdateRootList),
    webapp2.Route(r'/api/update_clipboard', handler=UpdateClipboard),
    webapp2.Route(r'/api/update_clipboard_social', handler = UpdateClipboardSocial),
    webapp2.Route(r'/api/update_node', handler=UpdateNode),
    webapp2.Route(r'/api/index_refresh/<node_id:[\w-]+>', handler = RefreshHandler),
    webapp2.Route(r'/index_view', handler = IndexHandler),
    # test for Jinja template system
    webapp2.Route(r'/test/jinja', handler=JinjaHandler),
    webapp2.Route('/social', SocialHandler),
    webapp2.Route('/social_individual/<plusid:[\w-]+>', handler = SocialIndividualHandler),
    webapp2.Route('/social_page', SocialPageHandler),

    webapp2.Route(decorator.callback_path, decorator.callback_handler()),
]
app = webapp2.WSGIApplication(routes=routes, debug=True)
