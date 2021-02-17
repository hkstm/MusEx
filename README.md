# VU.InfoVis2021

## Setup
Data in /data/kaggle folder can be obtained from [here](https://www.kaggle.com/yamaerenay/spotify-dataset-19212020-160k-tracks). The files are small enough in principle right now to store on GH but might slow down versioning and might [not be good practice](https://docs.github.com/en/github/managing-large-files)? 

I installed the requirements for Kaggle.ipynb (and other related files in the future) using:
```
python3 -m pip install -r requirements.txt
```
But this might differ for you and could be something like
```
pip3 install -r requirements.txt
``` 

## MongoDB
Starting Mongo (mongodb://root:example@localhost) and Mongo Express(http://localhost:8081/):
```
sudo docker-compose -f ./backend/mongodb/stack.yml up
```
You can use Mongo Express for administration, but personally mainly use VS Code plugin
## Usage Notes

Please clear jupyter notebooks before committing and pushing