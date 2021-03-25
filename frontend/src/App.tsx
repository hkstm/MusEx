import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import ReactDOM from 'react-dom';
import axios from "axios";
import { Size, Position, Genre, Node, NodeType } from "./common";
import Graph from "./graph/Graph";
import { MusicGraph } from "./graph/model";
import Select from "./Select";
import Minimap, { MinimapData } from "./charts/minimap/Minimap";
import Heatmap from "./charts/musicheatmap/heatmap";
import Slider from '@material-ui/core/Slider';
import GraphState from "./graph/Graph";
import "./App.sass";

import Widget from "./components/expandable-widget/widget";


import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faHighlighter } from "@fortawesome/free-solid-svg-icons";


const MAX_WORDCLOUD_SIZE = 100;

const config = {
  headers: { "Access-Control-Allow-Origin": "*" },
};

const options = {
  colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
  enableTooltip: true,
  deterministic: false,
  fontFamily: "impact",
  fontStyle: "normal",
  fontWeight: "normal",
  padding: 1,
  rotations: 0,
};

type AppState = {
  genres: Genre[];
  graph: MusicGraph;
  popularGenres: Genre[];
  artists: Genre[];
  popularArtists: Genre[];
  dimensions: string[];
  interests: MinimapData;
  sideviewExpanded: boolean;
  x: number;
  y: number;
  zoom: number;
  type: NodeType;
  selected?: Node;
  dimx: string;
  dimy: string;
  showGenre: Boolean;
  showArtist: Boolean;
  cloudYear: number;
};

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      genres: [],
      dimensions: [],
      graph: {
        nodes: [],
        links: [],
      },
      interests: {
        tiles: [],
        xSize: 20,
        ySize: 20,
      },
      sideviewExpanded: true,
      x: 0,
      y: 0,
      zoom: 0,
      type: "genre",
      selected: undefined,
      dimx: "",
      dimy: "",
      popularGenres: [],
      artists: [],
      popularArtists: [],
      showGenre: false,
      showArtist: false,
      cloudYear: 2020,
    }
    this._genreButtonClick = this._genreButtonClick.bind(this);
    this._artistButtonClick = this._artistButtonClick.bind(this);
  
    this._setGenre = this._setGenre.bind(this);
    this._setArtist = this._setArtist.bind(this)
  }

  _genreButtonClick(){
    this.setState({
      showArtist: false,
      showGenre: true,
    });
  }

  _artistButtonClick(){
    this.setState({
      showGenre: false,
      showArtist: true,
    })

  }
  _setGenre=()=>{
    this.setState({type: "genre"});
  };
  _setArtist=()=>{
    if(this.state.type === "genre"){
    this.setState({type: "artist"});
    }else{
      this.setState({type: "genre"});
    }
  };


  handleDimYChange = (selection: string) => {
    this.setState({ dimy: selection });
    this.updateGraph();
  };

  handleDimXChange = (selection: string) => {
    this.setState({ dimx: selection });
    this.updateGraph();
  };

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
    });
  };

  updateGraph = () => {
    console.log(this.state.dimx, this.state.dimy, this.state.zoom, this.state.type);
    axios
      .get(
        `http://localhost:5000/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.type}&limit=100`,
        config
      )
      .then((res) => {
        this.setState({ graph: res.data });
      });
  };

  updateDimensions = (): Promise<void> => {
    return axios.get(`http://localhost:5000/dimensions`, config).then((res) => {
      this.setState({ dimensions: res.data });
    });
  };

  updateGenres = () => {
    axios
      .get(`http://localhost:5000/most_popular?year=${this.state.cloudYear}&type=genre&limit=${MAX_WORDCLOUD_SIZE}`, config)
      .then((res) => {
        this.setState({
          genres: res.data.most_popular,
          popularGenres: res.data.most_popular.map(
            (g: { name: string; popularity: number }) => {
              return { text: g.name, value: g.popularity };
            }
          ),
        });
      });
  };

  updateArtists = () => {
    axios
      .get(`http://localhost:5000/most_popular?year=${this.state.cloudYear}&type=artist&limit=${MAX_WORDCLOUD_SIZE}`)
      .then((res) => {
        this.setState({
          artists: res.data.most_popular,
          popularArtists: res.data.most_popular.map(
            (a: { name: string; popularity: number }) => {
              return { text: a.name, value: a.popularity };
            }
          ),
        });
      });
  };

  handleMinimapUpdate = (pos: Position, size: Size) => {
    console.log(pos, size);
  };

  select(node: Node) {
    axios.get(`http://localhost:5000/dimensions`, config).then((res) => {
      this.setState({ dimensions: res.data.sort() });
    });
  }

  componentDidMount() {

    this.updateDimensions().then(() => {
      this.setState((state) => {
        return {
          dimx: state.dimensions[0],
          // dimy: state.dimensions[state.dimensions.length - 1],
          dimy: state.dimensions[2],
        };
      });
      this.updateGraph();
      this.updateGenres();
      this.updateArtists();
    });
  }

  render() {
    return (
      <div className="app">
        <header>
          <nav>
            <span id="app-name">MusEx</span>
            <div className="dimension-controller">
              <Select
          
                id="select-dimx"
                // value={this.state.dimx} this gives an error but is very important!!!
                onChange={this.handleDimXChange}
                options={this.state.dimensions}
              ></Select>
              <Select
                id="select-dimy"
                // value={this.state.dimy} this gives an error but is very important!!!
                onChange={this.handleDimYChange}
                options={this.state.dimensions}
             
              ></Select>
            </div>  
              <div id="app-stats">
                <input
                  type="text"
                  placeholder="Search"
                  name="s">
                </input>
                <select id = "dropdown" onChange={this._setArtist} ref = "cpDev1">
                  <option value="0">Select type:</option>
                  <option value="1">Genre</option>
                  <option value="2">Artist</option>
                </select>
                <button className="button" 
                  type="submit"
                  onClick={this.updateGraph}
                  >
                  Search
                  </button>
              </div>   
              <button className="helpbutton"
                id="app-help">
                help
              </button>     
            {/* <span id="app-help">Help</span> */}
          </nav>
        </header>
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <Widget>
              {/* <Minimap
                enabled={true}
                onUpdate={this.handleMinimapUpdate}
                data={this.state.interests}
                width={120}
                height={120}
              ></Minimap> */}
              {this.state.dimx === this.state.dimy ? <h1>Please select two different dimensions</h1>  :
                <Graph
                    enabled={true}
                    width={
                      window.innerWidth *
                        (this.state.sideviewExpanded ? 0.7 : 1.0) -
                           30
                      }
                    height={window.innerHeight - 40}
                    data={this.state.graph}
                ></Graph>
              }
            </Widget>
          </div>
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="side-view"
          >
            <FontAwesomeIcon
              className="icon toggle"
              icon={faBars}
              onClick={this.toggleSideview}
            />
   

            <Widget>
              <div className="sideview-widget wordcloud artist-wordcloud">
              <h3>Show wordcloud about the most popular:</h3>
            <button className="button" onClick={this._genreButtonClick}>Genres</button>
            <button className="button" onClick={this._artistButtonClick}>Artists</button>
            {this.state.showGenre ? <ReactWordcloud words={this.state.popularGenres} options={options} ></ReactWordcloud>  : null}
            {this.state.showArtist ? <ReactWordcloud words={this.state.popularArtists} options={options} ></ReactWordcloud> : null} 
            </div>
            </Widget>
            <Widget>
              <h3>Stats through different years</h3>
              <Heatmap></Heatmap> 
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
