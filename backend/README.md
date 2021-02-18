# InfoVis 2021

Note: All setup instructions are only tested under Linux and macOS.

#### Prerequisites

Clone this GitHub repository and navigate to the directory:
```bash
git clone git@github.com:hkstm/VU.InfoVis2021.git
git clone https://github.com/hkstm/VU.InfoVis2021.git # if you use HTTPS instead of SSH
cd VU.InfoVis2021
```

If not yet installed, get `pipenv` 
```bash
pip install pipenv
```

#### Setup

Activate the virtual environment for the backend, it is important that you are in the backend folder:
```bash
# assuming you have cloned the repo
# and you are in the project root folder as described in the Prerequisites
cd backend
pipenv install --dev
pipenv shell
```

If everything worked, your command line prompt should change to `(backend) ...`.
This means that the virtual environment for the backend is active and you can use the python packages we will need.
Now you can start the backend server with:
```bash
invoke start --open
```
This will run the server in development mode and open [http://localhost:5000](http://localhost:5000) in your browser.

After you are done working on the backend and you want the `(backend) ...` thing to go away, just run `exit` in your terminal.

#### Tooling

Before commiting code, make sure to format and lint your code:
```bash
invoke format
invoke lint
```
Optionally, you can also use type annotations and check for type errors:
```bash
invoke type-check
```
#### MongoDB

Starting Mongo (mongodb://root:example@localhost) and Mongo Express(http://localhost:8081/):
```
sudo docker-compose -f ./backend/mongodb/stack.yml up
```
You can use Mongo Express for administration, but personally mainly use VS Code plugin

A dump of the database can be made using:

```
sudo docker exec $(sudo docker ps -a | grep mongoinstance | awk '{print $1}') sh -c 'mongodump --authenticationDatabase admin --username root --password example --archive' > $(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/backend/mongodb/db.dump
```

And then restored by doing:
```
sudo docker exec -i $(sudo docker ps -a | grep mongoinstance | awk '{print $1}') sh -c 'mongorestore --authenticationDatabase admin --username root --password example --archive' < $(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/backend/mongodb/db.dump
```

The db_unmodified_csvs.dump is a replacement for the original kaggle csv's. ***After you loaded this dump into mongodb you can do*** (the commands above use the more generic name db.dump):

```
from mongodb import MongoAccess
csv_replacement = MongoAccess.get_collection('data')  # or any other collection name like data_by_genres
```

Don't know if macs support all the commands (substitutions) but this

$(sudo docker ps -a | grep mongoinstance | awk '{print $1}') is just the container id of the mongo instance which you can deduce from doing sudo docker ps -a

and this

$(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/backend/mongodb/db.dump

just the path to the db.dump file, you can store it wherever you want in principle
