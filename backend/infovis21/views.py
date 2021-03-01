import typing

from flask import jsonify

from infovis21.app import app


@app.route("/data")
def data() -> typing.Any:
    d = ["a", "b", "c", "d"]
    return jsonify(d)
