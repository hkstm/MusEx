from infovis21 import app
from flask import jsonify


@app.route("/data")
def data():
    d = ["a", "b", "c", "d"]
    return jsonify(d)
