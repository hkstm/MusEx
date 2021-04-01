import React, { Component } from "react";
import ReactWordcloud, { Word } from "react-wordcloud";
import ReactDOM from "react-dom";
import axios from "axios";
import { Size, Position, Genre, Node, NodeType } from "./common";
import Graph, { GraphDataDimensions } from "./graph/Graph";
import { MusicGraph } from "./graph/model";
import Select, { SelectOptions } from "./Select";
import { HeatmapTile } from "./charts/heatmap/Heatmap";
import Heatmap from "./charts/musicheatmap/heatmap";
import Streamgraph, {
  StreamgraphStream,
} from "./charts/streamgraph/Streamgraph";
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
  graph: MusicGraph;
  interests: MinimapData;
  highlighted: string[];
  dimensions: GraphDataDimensions;

  // Wordcloud
  wordcloudEnabled?: boolean;
  wordcloudYear: number;
  wordcloudType: NodeType;
  wordcloudLoading: boolean;
  wordcloudData: WordcloudWord[];

  // Streamgraph
  streamgraphEnabled?: boolean;
  streamgraphYearStart: number;
  streamgraphYearEnd: number;
  streamgraphLoading?: boolean;
  streamgraphData: {
    keys: string[];
    most_popular: StreamgraphStream[];
  };

  sideviewExpanded: boolean;
  searchQuery: string;
  searchType: string;
  x: number;
  y: number;
  zoom: number;
  zoomLevel: number;
  levelType: NodeType;
  dimx?: string;
  dimy?: string;
};

class App extends Component<{}, AppState> {
  levels: NodeType[] = ["genre", "artist", "track"];
  zoomLevels = 5;
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; levelType: NodeType } = undefined;
  apiVersion = "v2";
  mainViewWidthPercent = 0.6;

  wordCloudCallbacks = {
    getWordColor: (word: WordcloudWord) => word?.color ?? "white",
    onWordMouseOver: (event: WordcloudWord) => {},
    onWordClick: (event: { text: string }) => {
      // const attr = this.wordcloudType === "genre" ? "genre" : "name"
      const highlighted = this.state.graph.nodes
        // .forEach((n) => console.log(n, event.text))
        .filter((n) => n["name"].toLowerCase() == event.text.toLowerCase())
        .map((n) => n["id"]);
      console.log("highlighed", highlighted);
      this.setState({
        highlighted,
      });
    },
    getWordTooltip: (word: WordcloudWord) => "",
    // `${capitalize(word.text)} (${Math.round(word.value)})`,
  };

  constructor(props: {}) {
    super(props);
    this.state = {
      dimensions: {},
      graph: {
        nodes: [],
        links: [],
      },
      highlighted: [],
      interests: {
        tiles: this.buildData(20, 20),
        xSize: 20,
        ySize: 20,
      },
      // Wordcloud
      wordcloudEnabled: true,
      wordcloudLoading: true,
      wordcloudYear: 2020,
      wordcloudType: "genre",
      wordcloudData: [],
      // Streamgraph
      streamgraphEnabled: true,
      streamgraphYearStart: 2000,
      streamgraphYearEnd: 2020,
      streamgraphLoading: true,
      streamgraphData: {
        keys: [],
        most_popular: [],
      },
      sideviewExpanded: true,
      searchQuery: "",
      searchType: "artist",
      x: 0.5,
      y: 0.5,
      zoom: 0,
      zoomLevel: 0,
      levelType: "genre",
    };
  }

  buildData = (w: number, h: number) => {
    let data: HeatmapTile[] = [];
    Array(w)
      .fill(0)
      .forEach((_, wi) => {
        Array(h)
          .fill(0)
          .forEach((_, hi) => {
            data.push({
              x: wi,
              y: hi,
              value: 1,
            });
          });
      });
    return data;
  };

  onButtonClickHandler = () => {
    window.alert("Help!");
  };

  setSearchQuery = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({ searchQuery: target.value });
  };

  handleZoom = (zoom: number) => {
    const zoomLevel = Math.floor(zoom);
    const levelType = this.levels[Math.min(zoomLevel, this.levels.length - 1)];
    // console.log("zoom changed to", zoom, zoomLevel, levelType);
    // TODO: make this a lot smarter please!
    this.setState({ zoom: zoom - zoomLevel, zoomLevel, levelType }, () => {
      if (
        this.lastUpdate &&
        (Math.abs(this.lastUpdate.zoom - (zoom - zoomLevel)) >=
          1 / this.zoomLevels ||
          this.lastUpdate.levelType !== levelType)
      )
        console.log("trigger zoom based update");
      // this.updateGraph();
    });
  };

  handleWordcloudTypeChange = (typ: string) => {
    // console.log("wordcloud type changed to", typ);
    this.setState({ wordcloudType: typ as NodeType }, this.updateWordcloud);
  };

  handleWordcloudYearChange = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState(
      { wordcloudYear: parseInt(target.value) },
      this.updateWordcloud
    );
  };

  updateStreamgraph = () => {
    this.setState({ streamgraphLoading: true });
    axios
      .get(
        `http://localhost:5000/${this.apiVersion}/most_popular?year_min=${this.state.streamgraphYearStart}&year_max=${this.state.streamgraphYearEnd}&type=genre&use_super=yes&streamgraph=yes`,
        config
      )
      .then((res) => {
        // console.log(res.data);
        this.setState({
          streamgraphData: res.data as {
            keys: string[];
            most_popular: StreamgraphStream[];
          },
        });
      })
      .finally(() => this.setState({ streamgraphLoading: false }));
  };

  updateWordcloud = () => {
    this.setState({ wordcloudLoading: true });
    axios
      .get(
        `http://localhost:5000/${this.apiVersion}/most_popular?year_min=${this.state.wordcloudYear}&year_max=${this.state.wordcloudYear}&type=${this.state.wordcloudType}&limit=${MAX_WORDCLOUD_SIZE}`,
        config
      )
      .then((res) => {
        this.setState({
          wordcloudData: res.data.most_popular.map(
            (data: { popularity: number; color: string; name: string }) => {
              return {
                text: capitalize(data.name),
                value: data.popularity,
                color: data.color,
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
      this.state.zoomLevel,
      this.state.levelType
    );
    this.lastUpdate = {
      zoom: this.state.zoom,
      levelType: this.state.levelType,
    };

    const graphDataURL = `http://localhost:5000/${this.apiVersion}/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.levelType}&limit=1000`;
    axios.get(graphDataURL, config).then((res) => {
      // console.log(res.data.nodes.length + " nodes");
      // console.log(res.data.links.length + " links");
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

  select(node: Node) {
    // TODO
  }

  componentDidMount() {
    this.updateDimensions().then(() => {
      this.setState((state) => {
        return {};
      });
      // this.updateGraph();
      // this.updateStreamgraph();
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
                  options={{ artist: {}, genre: {} }}
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
                  highlighted={this.state.highlighted}
                  zoomLevels={this.zoomLevels}
                  levelType={this.state.levelType}
                  width={
                    window.innerWidth *
                      (this.state.sideviewExpanded
                        ? this.mainViewWidthPercent
                        : 1.0) -
                    30
                  }
                  height={window.innerHeight - 40}
                  dimensions={this.state.dimensions}
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
              <div className="wordcloud-container">
                <h3>
                  Most popular{" "}
                  <Select
                    id="select-wordcloud-type"
                    default="genre"
                    onChange={this.handleWordcloudTypeChange}
                    options={{ genre: {}, artist: {} }}
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
              <h3>Evolution of genres</h3>
              {this.state.streamgraphLoading && (
                <FontAwesomeIcon
                  className="loading-spinner icon toggle"
                  id="streamgraph-loading-spinner"
                  icon={faSpinner}
                  spin
                />
              )}

              {this.state.streamgraphEnabled &&
                !this.state.streamgraphLoading && (
                  <Streamgraph
                    data={this.state.streamgraphData.most_popular}
                    keys={this.state.streamgraphData.keys}
                    width={
                      window.innerWidth * (1 - this.mainViewWidthPercent) - 30
                    }
                    height={300}
                  ></Streamgraph>
                )}
            </Widget>
            <Widget>
              <h3>Evolution of musical features</h3>
              <Heatmap apiVersion={this.apiVersion}></Heatmap>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
