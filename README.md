## InfoVis 2021
#### Group 14

#### Setup

For setup instructions, please refer to the documents for the backend and the frontend respectively.

Data in /data/kaggle folder can be obtained from [here](https://www.kaggle.com/yamaerenay/spotify-dataset-19212020-160k-tracks). The files are small enough in principle right now to store on GH but might slow down versioning and might [not be good practice](https://docs.github.com/en/github/managing-large-files)? 

## MongoDB
Starting Mongo (mongodb://root:example@localhost) and Mongo Express(http://localhost:8081/):
```
sudo docker-compose -f ./backend/mongodb/stack.yml up
```
You can use Mongo Express for administration, but personally mainly use VS Code plugin
## Usage Notes

Please clear jupyter notebooks before committing and pushing
