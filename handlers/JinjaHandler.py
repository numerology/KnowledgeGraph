__author__ = 'Yicong'
"""This file is used to test Jinja2 template system"""
import webapp2
import jinja2
from constants import JINJA_ENVIRONMENT


class JinjaHandler(webapp2.RequestHandler):
    def get(self):
        template = JINJA_ENVIRONMENT.get_template('child_example.html')
        self.response.write(template.render())
