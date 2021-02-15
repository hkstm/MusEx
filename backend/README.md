# InfoVis 2021

#### Prerequisites

If not yet installed, get `pipenv` and activate the virtual environment for the project:
```bash
pip install pipenv
pipenv install --dev
pipenv shell
```

#### Setup

After you installed the prerequisites, start the backend server with 
```bash
invoke start --open
```
This will run the server in development mode at open [http://localhost:5000](http://localhost:5000) in your browser.

#### Tooling

Before commiting code, make sure to format and lint the code:
```bash
invoke format
invoke lint
```
Optionally, you can also use type annotations and check for type issues:
```bash
invoke start
```
