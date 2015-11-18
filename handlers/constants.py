__author__ = 'Jiaxiao Zheng'

import jinja2
import os


NDB_UPDATE_SLEEP_TIME = 0.3

IN_TYPE = "int"
EXT_TYPE = "ext"

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), '../templates')),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)