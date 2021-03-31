import React, { Component } from "react";
import ReactWordcloud, { Word } from "react-wordcloud";
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
import { capitalize } from "./utils";

import Widget from "./components/expandable-widget/widget";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faSpinner,
  faHighlighter,
} from "@fortawesome/free-solid-svg-icons";

const MAX_WORDCLOUD_SIZE = 50;

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

interface WordcloudWord extends Word {
  color?: string;
}

type AppState = {
  genres: Genre[];
  graph: MusicGraph;
  interests: MinimapData;
  wordcloudData: WordcloudWord[];
  dimensions: string[];
  wordcloudEnabled: boolean;
  wordcloudYear: number;
  wordcloudType: NodeType;
  wordcloudLoading: boolean;
  sideviewExpanded: boolean;
  searchQuery: string;
  searchType: string;
  x: number;
  y: number;
  zoom: number;
  zoomLevel: number;
  type: NodeType;
  dimx?: string;
  dimy?: string;
};

class App extends Component<{}, AppState> {
  type: NodeType[] = ["genre", "artist", "track"];
  zoomLevels = 5;
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; type: NodeType } = undefined;
  apiVersion = "v2";
  sideViewWidthPercent = 0.6;
  wordCloudCallbacks = {
    getWordColor: (word: WordcloudWord) => word?.color ?? "white",
    // onWordMouseOver: console.log,
    getWordTooltip: (word: WordcloudWord) =>
      `${capitalize(word.text)} (${Math.round(word.value)})`,
  };

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
      wordcloudEnabled: true,
      wordcloudLoading: true,
      wordcloudYear: 2020,
      wordcloudType: "genre",
      wordcloudData: [],
      sideviewExpanded: true,
      searchQuery: "",
      searchType: "artist",
      x: 0.5,
      y: 0.5,
      zoom: 0,
      zoomLevel: 0,
      type: "genre",
    };
  }

  onButtonClickHandler = () => {
    window.alert("Help!");
  };

  setSearchQuery = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({ searchQuery: target.value });
  };

  handleZoom = (zoom: number) => {
    const zoomLevel = Math.floor(zoom);
    const levelType = this.type[Math.min(zoomLevel, this.type.length - 1)];
    // console.log("zoom changed to", zoom, zoomLevel, levelType);
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

  handleWordcloudTypeChange = (typ: string) => {
    console.log("wordcloud type changed to", typ);
    this.setState({ wordcloudType: typ }, this.updateWordcloud);
  };

  handleWordcloudYearChange = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState(
      { wordcloudYear: parseInt(target.value) },
      this.updateWordcloud
    );
  };

  updateWordcloud = () => {
    console.log(this.state.wordcloudType, this.state.wordcloudYear);
    this.setState({ wordcloudLoading: true });
    axios
      .get(
        `http://localhost:5000/${this.apiVersion}/most_popular?year=${this.state.wordcloudYear}&type=${this.state.wordcloudType}&limit=${MAX_WORDCLOUD_SIZE}`,
        config
      )
      .then((res) => {
        this.setState({
          wordcloudData: res.data.most_popular.map(
            (word: { name: string; popularity: number; color: string }) => {
              return {
                text: capitalize(word.name),
                value: word.popularity,
                color: word.color,
              };
            }
          ),
        });
      })
      .finally(() => this.setState({ wordcloudLoading: false }));
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

  search = (event?: React.FormEvent<HTMLFormElement>) => () => {
    console.log("searching");
    event?.preventDefault();
    return;
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

  // updateGenres = () => {};

  // updateArtists = () => {
  //   axios
  //     .get(
  //       `http://localhost:5000/${this.apiVersion}/most_popular?year=${this.state.cloudYear}&type=artist&limit=${MAX_WORDCLOUD_SIZE}`
  //     )
  //     .then((res) => {
  //       this.setState({
  //         wordcloudData: res.data.most_popular.map(
  //           (a: { name: string; popularity: number }) => {
  //             return { text: capitalize(a.name), value: a.popularity };
  //           }
  //         ),
  //       });
  //     });
  // };

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
      // this.updateWordcloud();
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
              <form className="forms" onSubmit={this.search}>
                <input
                  type="text"
                  value={this.state.searchQuery}
                  onChange={this.setSearchQuery}
                  id="search-query-input"
                  placeholder="Search"
                />
                <Select
                  id="search-type-select"
                  default="artist"
                  onChange={this.handleSearchTypeChange}
                  options={["artist", "genre"]}
                ></Select>
                <button id="app-search" type="submit">
                  Search
                </button>
                <button id="app-help" onClick={this.onButtonClickHandler}>
                  Help
                </button>
              </form>
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
                      (this.state.sideviewExpanded
                        ? this.sideViewWidthPercent
                        : 1.0) -
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
                <h3>
                  Most popular{" "}
                  <Select
                    id="select-wordcloud-type"
                    default="genre"
                    onChange={this.handleWordcloudTypeChange}
                    options={["genre", "artist"]}
                  ></Select>{" "}
                  in{" "}
                  <input
                    className="numeric-input"
                    id="wordcloud-year-input"
                    value={this.state.wordcloudYear}
                    onChange={this.handleWordcloudYearChange}
                    type="number"
                    placeholder="Year"
                  />
                  :
                </h3>
                {this.state.wordcloudLoading && (
                  <FontAwesomeIcon
                    className="loading-spinner icon toggle"
                    id="wordcloud-loading-spinner"
                    icon={faSpinner}
                    spin
                  />
                )}

                {this.state.wordcloudEnabled &&
                  !this.state.wordcloudLoading && (
                    <ReactWordcloud
                      words={this.state.wordcloudData}
                      callbacks={this.wordCloudCallbacks}
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
