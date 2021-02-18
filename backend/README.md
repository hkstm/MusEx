# InfoVis 2021

Note: All setup instructions are only tested under Linux.

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
This will run the server in development mode and open [http://localhost:5000](http://localhost:5000) in your browser.

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

Don't know if macs support all the commands (substitutions) but this

$(sudo docker ps -a | grep mongoinstance | awk '{print $1}') is just the container id of the mongo instance which you can deduce from doing sudo docker ps -a

and this

$(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/backend/mongodb/db.dump

just the path to the db.dump file, you can store it wherever you want in principle