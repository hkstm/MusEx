import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import ReactDOM from "react-dom";
import axios from "axios";
import { Size, Position, Genre, Node, NodeType } from "./common";
import Graph from "./graph/Graph";
import { MusicGraph } from "./graph/model";
import Select from "./Select";
import Heatmap from "./charts/musicheatmap/heatmap";
import Slider from "@material-ui/core/Slider";
import GraphState from "./graph/Graph";
import "./App.sass";
import { MinimapData } from "./charts/minimap/Minimap";

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
  interests: MinimapData;
  popularGenres: Genre[];
  artists: Genre[];
  popularArtists: Genre[];
  dimensions: string[];
  wordCloudEnabled: boolean;
  sideviewExpanded: boolean;
  searchQuery: string;
  searchType: string;
  x: number;
  y: number;
  zoom: number;
  zoomLevel: number;
  type: NodeType;
  selected?: Node;
  total: number;
  dimx?: string;
  dimy?: string;
  showGenreWordcloud: Boolean;
  showArtistWordcloud: Boolean;
  cloudYear: number;
};

class App extends Component<{}, AppState> {
  type: NodeType[] = ["genre", "artist", "track"];
  zoomLevels = 5;
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; type: NodeType } = undefined;
  apiVersion = "v2";

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
      wordCloudEnabled: false,
      sideviewExpanded: true,
      searchQuery: "",
      searchType: "artist",
      x: 0.5,
      y: 0.5,
      zoom: 0,
      zoomLevel: 0,
      type: "genre",
      selected: undefined,
      total: 0,
      popularGenres: [],
      artists: [],
      popularArtists: [],
      showGenreWordcloud: false,
      showArtistWordcloud: false,
      cloudYear: 2020,
    };
    this.setSearchQuery = this.setSearchQuery.bind(this);
  }

  onButtonClickHandler = () => {
    window.alert("Help!");
  };

  showGenreWordcloud = () => {
    this.setState({
      showArtistWordcloud: false,
      showGenreWordcloud: true,
    });
  };

  showArtistWordcloud = () => {
    this.setState({
      showGenreWordcloud: false,
      showArtistWordcloud: true,
    });
  };

  setSearchQuery(event: React.FormEvent) {
    const target = event.target as HTMLInputElement;
    this.setState({ searchQuery: target.value });
  }

  handleZoom = (zoom: number) => {
    const zoomLevel = Math.floor(zoom);
    const levelType = this.type[Math.min(zoomLevel, this.type.length - 1)];
    console.log("zoom changed to", zoom, zoomLevel, levelType);
    this.setState(
      { zoom: zoom - zoomLevel, zoomLevel, type: levelType },
      () => {
        if (
          this.lastUpdate &&
          (Math.abs(this.lastUpdate.zoom - (zoom - zoomLevel)) >=
            1 / this.zoomLevels ||
            this.lastUpdate.type !== levelType)
        )
          this.updateGraph();
      }
    );
  };

  handleDimYChange = (dimy: string) => {
    console.log("changed y dim to", dimy);
    this.setState({ dimy }, this.updateGraph);
  };

  handleDimXChange = (dimx: string) => {
    console.log("changed x dim to", dimx);
    this.setState({ dimx }, this.updateGraph);
  };

  handleSearchTypeChange = (typ: string) => {
    console.log("changed search type to", typ);
    this.setState({ searchType: typ }, this.search);
  };

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
    });
  };

  search = () => {
    let searchURL = `http://localhost:5000/${this.apiVersion}/search?dimx=${this.state.dimx}&dimy=${this.state.dimy}&searchterm=${this.state.searchQuery}&type=${this.state.searchType}`;
    console.log(searchURL);
    axios.get(searchURL, config).then((res) => {
      console.log(res.data);
      // this.setState({ graph: res.data });
    });
  };

  updateGraph = () => {
    console.log(
      "updating graph for ",
      this.state.dimx,
      this.state.dimy,
      this.state.x,
      this.state.y,
      this.state.zoom,
      this.state.type
    );
    this.lastUpdate = { zoom: this.state.zoom, type: this.state.type };

    const graphDataURL = `http://localhost:5000/${this.apiVersion}/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.type}&limit=1000`;
    // console.log(graphDataURL);
    axios.get(graphDataURL, config).then((res) => {
      console.log(res.data.nodes.length + " nodes");
      console.log(res.data.links.length + " links");
      this.setState({ graph: res.data });
    });
  };

  updateDimensions = (): Promise<void> => {
    return axios
      .get(`http://localhost:5000/${this.apiVersion}/dimensions`, config)
      .then((res) => {
        this.setState({ dimensions: res.data });
      });
  };

  updateGenres = () => {
    axios
      .get(
        `http://localhost:5000/${this.apiVersion}/most_popular?year=${this.state.cloudYear}&type=genre&limit=${MAX_WORDCLOUD_SIZE}`,
        config
      )
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
      .get(
        `http://localhost:5000/${this.apiVersion}/most_popular?year=${this.state.cloudYear}&type=artist&limit=${MAX_WORDCLOUD_SIZE}`
      )
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

  select(node: Node) {
    axios
      .get(`http://localhost:5000/${this.apiVersion}/dimensions`, config)
      .then((res) => {
        this.setState({ dimensions: res.data.sort() });
      });
  }

  componentDidMount() {
    this.updateDimensions().then(() => {
      this.setState((state) => {
        return {};
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
            <div className="controls">
              <span id="app-name">MusEx</span>
              <div className="dimensions">
                <Select
                  id="select-dimx"
                  default="energy"
                  onChange={this.handleDimXChange}
                  options={this.state.dimensions}
                ></Select>
                <Select
                  id="select-dimy"
                  default="tempo"
                  onChange={this.handleDimYChange}
                  options={this.state.dimensions}
                ></Select>
              </div>
              <div className="forms">
                <input
                  type="text"
                  value={this.state.searchQuery}
                  onChange={this.setSearchQuery}
                  id="search-query-input"
                  placeholder="Search"
                />
                {true && (
                  <Select
                    id="search-type-select"
                    default="artist"
                    onChange={this.handleSearchTypeChange}
                    options={["artist", "genre"]}
                  ></Select>
                )}
                <button id="app-search" onClick={this.search}>
                  Search
                </button>
                <button id="app-help" onClick={this.onButtonClickHandler}>
                  Help
                </button>
              </div>
            </div>
          </nav>
        </header>
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <Widget>
              {this.state.dimx === this.state.dimy ? (
                <h1>Please select two different dimensions</h1>
              ) : (
                <Graph
                  enabled={true}
                  interests={this.state.interests}
                  zoomLevels={this.zoomLevels}
                  width={
                    window.innerWidth *
                      (this.state.sideviewExpanded ? 0.7 : 1.0) -
                    30
                  }
                  height={window.innerHeight - 40}
                  onZoom={this.handleZoom}
                  data={this.state.graph}
                ></Graph>
              )}
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
                <button className="button" onClick={this.showGenreWordcloud}>
                  Genres
                </button>
                <button className="button" onClick={this.showArtistWordcloud}>
                  Artists
                </button>
                {this.state.showGenreWordcloud && (
                  <ReactWordcloud
                    words={this.state.popularGenres}
                    options={options}
                  ></ReactWordcloud>
                )}
                {this.state.showArtistWordcloud && (
                  <ReactWordcloud
                    words={this.state.popularArtists}
                    options={options}
                  ></ReactWordcloud>
                )}
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
