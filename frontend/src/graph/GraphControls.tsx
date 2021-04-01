import React, { Component } from "react";
import axios from "axios";
import {  Node, NodeType } from "../common";
import Graph, { GraphDataDimensions } from "../graph/Graph";
import { MusicGraph } from "../graph/model";
import Select, { SelectOptions } from "../Select";
import Heatmap from "../charts/musicheatmap/heatmap";
import Streamgraph, {
  StreamgraphStream,
} from "../charts/streamgraph/Streamgraph";
import "./GraphControls.sass";
import { MinimapData } from "../charts/minimap/Minimap";
import { capitalize } from "../utils";

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

interface WordcloudWord {
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
  type: NodeType;
  dimx?: string;
  dimy?: string;
};

class App extends Component<{sideviewExpanded: boolean, mainViewWidthPercent: number}, AppState> {
  type: NodeType[] = ["genre", "artist", "track"];
  zoomLevels = 5;
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; type: NodeType } = undefined;
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

  constructor(props: {sideviewExpanded: true, mainViewWidthPercent: 0}) {
    super(props);
    this.state = {
      dimensions: {},
      graph: {
        nodes: [],
        links: [],
      },
      highlighted: [],
      interests: {
        tiles: [],
        xSize: 20,
        ySize: 20,
      },
      // Wordcloud
      wordcloudEnabled: true,
      wordcloudLoading: true,
      wordcloudYear: 2020,
      wordcloudType: "genre",
      wordcloudData: [],
      //
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
        console.log(res.data);
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
      this.state.type
    );
    this.lastUpdate = { zoom: this.state.zoom, type: this.state.type };

    const graphDataURL = `http://localhost:5000/${this.apiVersion}/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.type}&limit=1000`;
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

  select(node: Node) {
    // TODO
  }

  componentDidMount() {
    this.updateDimensions().then(() => {
      this.setState((state) => {
        return {};
      });
      this.updateGraph();
      this.updateStreamgraph();
    });
  }

  render() {
    return (
      <div className="graph-widget">
        <div className="graph-controls">
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
        <div id="content">
            <div>
            <Graph
                enabled={true}
                interests={this.state.interests}
                highlighted={this.state.highlighted}
                zoomLevels={this.zoomLevels}
                width={
                window.innerWidth *
                    (this.props.sideviewExpanded
                    ? this.props.mainViewWidthPercent
                    : 1.0) -
                30
                }
                height={window.innerHeight - 80}
                dimensions={this.state.dimensions}
                onZoom={this.handleZoom}
                data={this.state.graph}
            ></Graph>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
