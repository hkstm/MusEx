"""
Tasks for maintaining the project.
Execute 'invoke --list' for guidance on using invoke
"""
import shutil
from pprint import pprint
import datetime

from invoke import task
import webbrowser
from pathlib import Path
from infovis21.mongodb import utils as dbutils

Path().expanduser()

ROOT_DIR = Path(__file__).parent
PROJECT_DIR = ROOT_DIR.parent
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


@task(help={"open": "Automatically opens the page in the browser"})
def start(c, _open=False):
    """Start the flask server"""
    if _open:
        webbrowser.open("http://localhost:5000")
    c.run("FLASK_APP=infovis21.app FLASK_ENV=development pipenv run flask run")


@task(help={"sudo": "Use sudo"})
def snapshot(c, sudo=False):
    """Create a snapshot of the current mongodb database"""
    _sudo = "sudo" if sudo else ""
    c.run(
        f"{_sudo} docker exec $({_sudo} docker ps -a | grep musexmongodb | awk '{{print $1}}') sh -c 'mongodump --authenticationDatabase admin --username root --password example --archive' > {PROJECT_DIR}/data/db.dump"
    )


@task(help={"sudo": "Use sudo"})
def restore(c, sudo=False):
    """Restore the database from a snapshot"""
    _sudo = "sudo" if sudo else ""
    c.run(
        f"{_sudo} docker exec -i $({_sudo} docker ps -a | grep musexmongodb | awk '{{print $1}}') sh -c 'mongorestore --authenticationDatabase admin --username root --password example --archive' < {PROJECT_DIR}/data/db.dump"
    )

@task
def compute_min_max(c):
    """Compute min and max ranges of values in the dataset"""
    res = dbutils.compute_min_max()
    pprint(res)


@task
def add_labels_to_genres(c):
    """Add labels to genres"""
    res = dbutils.add_labels_to_genres()
    pprint(res)


@task
def create_album_collection(c):
    """Create album collection"""
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
