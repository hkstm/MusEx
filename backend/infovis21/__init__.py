# -*- coding: utf-8 -*-

"""Top-level package for favico."""

__author__ = """group14"""
__email__ = "group14@noreply.com"
__version__ = "0.1.0"

from flask import Flask

app = Flask(__name__)
from infovis21 import views
