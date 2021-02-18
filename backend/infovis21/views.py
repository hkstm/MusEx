from flask import jsonify

from infovis21 import app


@app.route("/data")
def data():
    d = ["a", "b", "c", "d"]
    return jsonify(d)
