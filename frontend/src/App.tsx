import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import axios from "axios";
import { Size, Position, Genre, Node, NodeType } from "./common";
import Graph from "./graph/Graph";
import { MusicGraph } from "./graph/model";
import Select from "./Select";
import Minimap, { MinimapData } from "./charts/minimap/Minimap";
import "./App.sass";
import { stats } from "./mocks/stats";
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
  total: number;
  popularGenres: Genre[];
  artists: Genre[];
  totalArtists: string;
  popularArtists: Genre[];
  dimensions: string[];
  interests: MinimapData;
  wordCloudEnabled: boolean;
  sideviewExpanded: boolean;
  x: number;
  y: number;
  zoom: number;
  zoomLevel: number;
  type: NodeType;
  selected?: Node;
  dimx?: string;
  dimy?: string;
};

class App extends Component<{}, AppState> {
  type: NodeType[] = ["genre", "artist", "track"];
  zoomLevels = 5;
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; type: NodeType } = undefined;

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
      x: 0.5,
      y: 0.5,
      zoom: 0,
      zoomLevel: 0,
      type: "genre",
      selected: undefined,
      total: 0,
      popularGenres: [],
      artists: [],
      totalArtists: "",
      popularArtists: [],
    };
  }

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

  handleDimYChange = (dimy: string) => {
    console.log("changed y dim to", dimy);
    this.setState({ dimy }, this.updateGraph);
  };

  handleDimXChange = (dimx: string) => {
    console.log("changed x dim to", dimx);
    this.setState({ dimx }, this.updateGraph);
  };

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
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

    const graphDataURL = `http://localhost:5000/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.state.dimx}&dimy=${this.state.dimy}&type=${this.state.type}&limit=1000`;
    // console.log(graphDataURL);
    axios.get(graphDataURL, config).then((res) => {
      console.log(res.data.nodes.length + " nodes");
      console.log(res.data.links.length + " links");
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
          total: res.data.total,
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
          totalArtists: res.data.total,
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
          // dimx: state.dimensions[0],
          // dimy: state.dimensions[state.dimensions.length - 1],
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
                {stats.map((stat) => (
                  <div key={stat.label} className="stat">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
            </Widget>

            <Widget>
              <div className="sideview-widget wordcloud artist-wordcloud">
                <h3>Most popular artists</h3>
                {this.state.wordCloudEnabled && (
                  <ReactWordcloud
                    words={this.state.popularArtists}
                    options={options}
                  />
                )}
              </div>
            </Widget>
            <Widget>
              <div className="sideview-widget wordcloud genre-wordcloud">
                <h3>Most popular genres</h3>
                {this.state.wordCloudEnabled && (
                  <ReactWordcloud
                    words={this.state.popularGenres}
                    options={options}
                  />
                )}
              </div>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
