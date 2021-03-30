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
#### Precompute zoom level data

```bash
invoke precompute

# for quicker testing, you can just precompute for one selected categories
```

**Warning**: This will take some long time depending on your machine...


#### Optional: Download audio preview cache

To be able to use the spotify API for the downloading of the previews or for getting preview_urls for tracks on the fly, make sure you create a spotify application with a client ID and set it in a file called `.env` in the backend folder with at least the following line:
```bash
SPOTIPY_CLIENT_ID=your-client-id
SPOTIPY_CLIENT_SECRET=your-client-secret
```

If you have completed the spotify API setup, you can use the command for pre-computing like this:
```bash
# audio preview files will be stored into data/cache/previews
invoke download-audio-previews --limit 10000 --offset 0 # the first 10000
invoke download-audio-previews --limit 10000 --offset 10000 # the second 10000
invoke download-audio-previews --limit 10000 --offset 20000 # the third 10000
# and so on ...
```

#### MongoDB

Starting Mongo (mongodb://root:example@localhost) and Mongo Express(http://localhost:8081/) assuming you are in the VU.InfoVis2021 root directory:
```bash
sudo docker-compose -f stack.yml up
```
You can use Mongo Express for administration, but personally mainly use VS Code plugin

The database dump the last time I checked is about 150mb which is too big for github so I made a zip of it and it's around 40 mb. If you get any errors when dealing with the file when committing or restoring please make sure that you (un)zipped the file (db.zip <-> db.dump)

A dump of the database can be restored by doing:
```bash
cd backend
invoke snapshot
invoke snapshot --sudo # if you are not in the docker group

# or manually
sudo docker exec -i $(sudo docker ps -a | grep musexmongodb | awk '{print $1}') sh -c 'mongorestore --authenticationDatabase admin --username root --password example --archive' < $(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/data/db.dump
```

A dump of the database can be made using:
```bash
cd backend
invoke restore
invoke restore --sudo # if you are not in the docker group

sudo docker exec $(sudo docker ps -a | grep musexmongodb | awk '{print $1}') sh -c 'mongodump --authenticationDatabase admin --username root --password example --archive' > $(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/data/db.dump
```

```
from mongodb import MongoAccess as ma
csv_replacement = ma.get_collection(ma.coll_tracks)  # or other collection ma.coll_[tracks|genres|years|artists|albums]
```

Don't know if macs support all the commands (substitutions) but this

$(sudo docker ps -a | grep musexmongodb | awk '{print $1}') is just the container id of the mongo instance which you can deduce from doing sudo docker ps -a

and this

$(find ~ -type d -name VU.InfoVis2021 2> /dev/null)/data/db.dump

just the path to the db.dump file, you can store it wherever you want in principle
