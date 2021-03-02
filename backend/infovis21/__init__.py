# -*- coding: utf-8 -*-

"""Top-level package for favico."""

__author__ = """group14"""
__email__ = "group14@noreply.com"
__version__ = "0.1.0"

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
app.config["JSONIFY_PRETTYPRINT_REGULAR"] = True
CORS(app)
from infovis21 import views
