"""
Tasks for maintaining the project.
Execute 'invoke --list' for guidance on using invoke
"""
import shutil
from pprint import pprint
import datetime
import itertools

from invoke import task
import webbrowser
from pathlib import Path

Path().expanduser()

ROOT_DIR = Path(__file__).parent
PROJECT_DIR = ROOT_DIR.parent
DATA_DIR = PROJECT_DIR.joinpath("data")
PREVIEW_CACHE_DIR = DATA_DIR.joinpath("cache/previews")
SETUP_FILE = ROOT_DIR.joinpath("setup.py")
TEST_DIR = ROOT_DIR.joinpath("tests")
SOURCE_DIR = ROOT_DIR.joinpath("infovis21")
TOX_DIR = ROOT_DIR.joinpath(".tox")
COVERAGE_FILE = ROOT_DIR.joinpath(".coverage")
COVERAGE_DIR = ROOT_DIR.joinpath("htmlcov")
COVERAGE_REPORT = COVERAGE_DIR.joinpath("index.html")
PYTHON_DIRS = [str(d) for d in [SOURCE_DIR, TEST_DIR]]


def _delete_file(file):
    try:
        file.unlink(missing_ok=True)
    except TypeError:
        # missing_ok argument added in 3.8
        try:
            file.unlink()
        except FileNotFoundError:
            pass


@task(help={"check": "Checks if source is formatted without applying changes"})
def format(c, check=False):
    """Format code"""
    python_dirs_string = " ".join(PYTHON_DIRS)
    black_options = "--diff" if check else ""
    c.run("pipenv run black {} {}".format(black_options, python_dirs_string))
    isort_options = "{}".format("--check-only" if check else "")
    c.run("pipenv run isort {} {}".format(isort_options, python_dirs_string))


@task(
    help={
        "open": "Automatically opens the page in the browser",
        "debug": "Enable debug mode",
    }
)
def start(c, _open=False, debug=True):
    """Start the flask server"""
    if _open:
        webbrowser.open("http://localhost:5000")
    c.run(
        f"{'FLASK_DEBUG=1 FLASK_ENV=development' if debug else ''} FLASK_APP=infovis21.app pipenv run flask run"
    )


@task(help={"sudo": "Use sudo"})
def snapshot(c, sudo=False):
    """Create a snapshot of the current mongodb database"""
    _sudo = "sudo" if sudo else ""
    c.run(
        f"{_sudo} docker exec $({_sudo} docker ps -a | grep musexmongodb | awk '{{print $1}}') sh -c 'mongodump --db kaggle --authenticationDatabase admin --username root --password example --archive' > {PROJECT_DIR}/data/db.dump"
    )


@task(help={"sudo": "Use sudo"})
def restore(c, sudo=False):
    """Restore the database from a snapshot"""
    _sudo = "sudo" if sudo else ""
    data_archive = DATA_DIR / "db.tar.xz"
    try:
        print(f"unarchiving {data_archive}")
        # c.run(f"unzip -o {data_archive} -d {DATA_DIR}") # when using zip
        c.run(f"tar -C {DATA_DIR} -zxvf {data_archive}")
    except Exception as e:
        print(e)
        print(f"failed to unarchive {data_archive}")
        print("make sure you have installed unzip and tar (e.g. sudo apt-get install unzip tar)")
        return
        print("proceeding without unzipping...")
    c.run(
        f"{_sudo} docker exec -i $({_sudo} docker ps -a | grep musexmongodb | awk '{{print $1}}') sh -c 'mongorestore  --drop --db kaggle --authenticationDatabase admin --username root --password example --archive' < {PROJECT_DIR}/data/db.dump"
    )


@task
def precompute(
    c,
    _dimx=None,
    _dimy=None,
    _typ=None,
    _zoom=None,
    limit=None,
    offset=None,
    plot=False,
):
    from infovis21.mongodb import MongoAccess as ma
    from infovis21.mongodb import utils as dbutils

    x_dims = [_dimx] if _dimx else ma.dimensions
    y_dims = [_dimy] if _dimy else ma.dimensions
    types = [_typ] if _typ else ["genre", "artist", "track"]
    zoomes = [int(_zoom)] if _zoom else range(dbutils.N_ZOOM_LEVELS)

    for dimx, dimy, typ, zoom in itertools.product(x_dims, y_dims, types, zoomes):
        if dimx != dimy:
            dbutils.precompute_nodes(
                dimx, dimy, typ, zoom, offset=offset or 0, limit=limit, plot=plot
            )


@task
def download_audio_previews(c, limit=None, offset=None):
    """ Download audio file previews via the spotify API """
    import requests
    from infovis21 import spotifyapi as api
    from infovis21.mongodb import MongoAccess as ma

    offset = int(offset) if offset else 0
    pipeline = [
        {"$match": {}},  # all tracks
        {"$sort": {"id": ma.DESC}},  # required for deterministic results
        {"$skip": offset},  # to select which tracks to download
    ]
    if limit is not None:
        pipeline.append({"$limit": int(limit)})

    for idx, track in enumerate(ma.coll_tracks.aggregate(pipeline)):
        track_id = track.get("id")
        current = offset + idx + 1
        current = (
            f"({current}{'/' + str(offset + int(limit)) if limit is not None else ''})"
        )

        print(current, f"Processing {track_id} ...")
        if track_id is not None:
            track = api.get_spotify_track(track_id)
            preview_url = track.get("preview_url")
            # pprint(track)
            if preview_url is not None:
                preview_file = PREVIEW_CACHE_DIR / (track_id + ".mp3")
                if preview_file.exists():
                    continue
                preview_file.parent.mkdir(parents=True, exist_ok=True)
                print(current, f"Downloading {preview_file} ...")
                preview = requests.get(preview_url)
                with open(preview_file, "wb") as f:
                    f.write(preview.content)


@task
def compute_min_max(c):
    """Compute min and max ranges of values in the dataset"""
    from infovis21.mongodb import utils as dbutils

    res = dbutils.compute_min_max()
    pprint(res)


@task
def add_labels_to_genres(c):
    """Add labels to genres"""
    from infovis21.mongodb import utils as dbutils

    res = dbutils.add_labels_to_genres()
    pprint(res)


@task
def create_album_collection(c):
    """Create album collection"""
    from infovis21.mongodb import utils as dbutils

    pprint(f"Started at {datetime.datetime.now()}")
    res = dbutils.create_album_collection()
    pprint(res)


@task
def lint(c):
    """Lint code"""
    c.run("pipenv run flake8 {}".format(SOURCE_DIR))


@task
def test(c, min_coverage=None):
    """Run tests"""
    pytest_options = "--cov-fail-under={}".format(min_coverage) if min_coverage else ""
    c.run("pipenv run pytest --cov={} {}".format(SOURCE_DIR, pytest_options))


@task
def type_check(c):
    """Check types"""
    c.run("pipenv run mypy")


def _create(d, *keys):
    current = d
    for key in keys:
        try:
            current = current[key]
        except (TypeError, KeyError):
            current[key] = dict()
            current = current[key]


@task
def install_hooks(c):
    """Install pre-commit hooks"""
    c.run("pipenv run pre-commit install -t pre-commit")
    c.run("pipenv run pre-commit install -t pre-push")


@task
def pre_commit(c):
    """Run all pre-commit checks"""
    c.run("pipenv run pre-commit run --all-files")


@task(
    pre=[test],
    help=dict(
        publish="Publish the result (default False)",
        provider="The provider to publish (default codecov)",
    ),
)
def coverage(c, publish=False, provider="codecov"):
    """Create coverage report"""
    if publish:
        # Publish the results via provider (e.g. codecov or coveralls)
        c.run("pipenv run {}".format(provider))
    else:
        # Build a local report
        c.run("pipenv run coverage html -d {}".format(COVERAGE_DIR))
        webbrowser.open(COVERAGE_REPORT.as_uri())


@task
def clean_build(c):
    """Clean up files from package building"""
    c.run("rm -fr build/")
    c.run("rm -fr dist/")
    c.run("rm -fr .eggs/")
    c.run("find . -name '*.egg-info' -exec rm -fr {} +")
    c.run("find . -name '*.egg' -exec rm -f {} +")


@task
def clean_python(c):
    """Clean up python file artifacts"""
    c.run("find . -name '*.pyc' -exec rm -f {} +")
    c.run("find . -name '*.pyo' -exec rm -f {} +")
    c.run("find . -name '*~' -exec rm -f {} +")
    c.run("find . -name '__pycache__' -exec rm -fr {} +")


@task
def clean_tests(c):
    """Clean up files from testing"""
    _delete_file(COVERAGE_FILE)
    shutil.rmtree(TOX_DIR, ignore_errors=True)
    shutil.rmtree(COVERAGE_DIR, ignore_errors=True)


@task(pre=[clean_build, clean_python, clean_tests])
def clean(c):
    """Runs all clean sub-tasks"""
    pass


@task(clean)
def dist(c):
    """Build source and wheel packages"""
    c.run("python setup.py sdist")
    c.run("python setup.py bdist_wheel")


@task(pre=[clean, dist])
def release(c):
    """Make a release of the python package to pypi"""
    c.run("twine upload dist/*")
