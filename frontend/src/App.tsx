import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import axios from "axios";
import { Size, Position, Genre, Node, NodeType } from "./common";
import Graph from "./graph/Graph";
import { MusicGraph } from "./graph/model";
import Select from "./Select";
import Minimap, { MinimapData } from "./charts/minimap/Minimap";

import "./App.sass";

import Widget from "./components/expandable-widget/widget";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

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
      zoom: 5,
      type: "genre",
      selected: undefined,
      dimx: "",
      dimy: "",
      popularGenres: [],
      artists: [],
      popularArtists: [],
      showGenre: false,
      showArtist: false,
    }
    this._genreButtonClick = this._genreButtonClick.bind(this);
    this._artistButtonClick = this._artistButtonClick.bind(this);
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

  handleDimYChange = (dimy: string) => {
    this.setState({ dimy });
    this.updateGraph();
  };

  handleDimXChange = (dimx: string) => {
    this.setState({ dimx });
    this.updateGraph();
  };

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
    });
  };

  updateGraph = () => {
    console.log(this.state.x, this.state.y, this.state.zoom, this.state.type);
    axios
      .get(
        `http://localhost:5000/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.type}&limit=1000`,
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
      .get(`http://localhost:5000/genres?limit=${MAX_WORDCLOUD_SIZE}`, config)
      .then((res) => {
        this.setState({
          genres: res.data.genres,
          popularGenres: res.data.genres.map(
            (g: { name: string; popularity: number }) => {
              return { text: g.name, value: g.popularity };
            }
          ),
        });
      });
  };

  updateArtists = () => {
    axios
      .get(`http://localhost:5000/artists?limit=${MAX_WORDCLOUD_SIZE}`)
      .then((res) => {
        this.setState({
          artists: res.data.artists,
          popularArtists: res.data.artists.map(
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
          dimy: state.dimensions[state.dimensions.length - 1],
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
                onChange={this.handleDimXChange}
                options={this.state.dimensions}
              ></Select>
              <Select
                id="select-dimy"
                onChange={this.handleDimYChange}
                options={this.state.dimensions}
              ></Select>
            </div>
            <span id="app-help">Help</span>
          </nav>
        </header>
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <Widget>
              <Minimap
                enabled={true}
                onUpdate={this.handleMinimapUpdate}
                data={this.state.interests}
                width={120}
                height={120}
              ></Minimap>
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
              <div className="sideview-widget app-stats">
              <input
              type="text"
              placeholder="Search artist or genre"
              name="s"></input>
              <button className="button" type="submit">Search</button>
              </div>
            </Widget>

            <Widget>
              <div className="sideview-widget wordcloud artist-wordcloud">
              <h3>Show wordcloud about the most popular:</h3>
            <button className="button" onClick={this._genreButtonClick}>Genres</button>
            <button className="button" onClick={this._artistButtonClick}>Artists</button>
            {this.state.showGenre ? <ReactWordcloud words={this.state.popularGenres} options={options} ></ReactWordcloud> : null}
            {this.state.showArtist ? <ReactWordcloud words={this.state.popularArtists} options={options} ></ReactWordcloud> : null}         
              </div>
            </Widget>
            <Widget>
              <div className="sideview-widget wordcloud genre-wordcloud">
                <h3>Stats through different years</h3>

              </div>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
