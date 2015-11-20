__author__ = 'Jiaxiao Zheng'

import jinja2
import os


NDB_UPDATE_SLEEP_TIME = 0.3

IN_TYPE_IMG = "int"
IN_TYPE_PDF = "pdf"
EXT_TYPE = "ext"
THUMBNAIL_SIZE = 100

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), '../templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)