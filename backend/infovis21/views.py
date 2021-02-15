from infovis21 import app


@app.route("/")
def hello_world():
    return "Hello, World!"
