import React, { Component } from "react";
import axios from "axios";
import { headerConfig, apiVersion } from "../common";
import Graph, { GraphDataDimensions } from "./Graph";
import Select from "../Select";
import "./GraphControls.sass";

type GraphControlProps = {
  graphWidth: number;
  graphHeight: number;
};

type GraphControlState = {
  dimensions: GraphDataDimensions;
  dimx?: string;
  dimy?: string;
  searchQuery: string;
  searchType: string;
};

class GraphControl extends Component<GraphControlProps, GraphControlState> {
  zoomLevels = 6;

  constructor(props: GraphControlProps) {
    super(props);
    this.state = {
      dimensions: {},
      searchQuery: "",
      searchType: "artist",
    };
  }

  showHelp = (event?: React.FormEvent) => {
    window.alert(
      "FAQ\n" +
        "\n??Need help searching for specific genres or artists??\n--Type in the top right search bar and pick from artist or genre!" +
        "\n??Want to see stats of audio features throughout the years??\n--Try the slidebar underneath the heatmap!" +
        "\n??Want to focus only on the graph??\n--Click the three stacked bars next to the wordcloud to blend them out!" +
        "\n??Need to know how to click??\n--LeftClick -> (Un)highlight node\n--Shift + LeftClick -> Play/stop music\n--Double LeftClick -> Zooming\n"
    );
    event?.preventDefault();
  };

  setSearchQuery = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({ searchQuery: target.value });
  };

  handleDimYChange = (dimy: string) => {
    console.log("changed y dim to", dimy);
    this.setState({ dimy });
  };

  handleDimXChange = (dimx: string) => {
    console.log("changed x dim to", dimx);
    this.setState({ dimx });
  };

  handleSearchTypeChange = (typ: string) => {
    console.log("changed search type to", typ);
    this.setState({ searchType: typ }, this.search);
  };

  search = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    event?.nativeEvent.stopImmediatePropagation();
    if (this.state.searchQuery.length < 1) return;
    let searchURL = `http://localhost:5000/${apiVersion}/search?dimx=${this.state.dimx}&dimy=${this.state.dimy}&searchterm=${this.state.searchQuery}&type=${this.state.searchType}`;
    console.log(searchURL);
    axios.get(searchURL, headerConfig).then((res) => {
      console.log(res.data);
      // this.setState({ graph: res.data });
    });
  };

  updateDimensions = (): Promise<void> => {
    return axios
      .get(`http://localhost:5000/${apiVersion}/dimensions`, headerConfig)
      .then((res) => {
        this.setState({ dimensions: res.data });
      });
  };

  componentDidMount() {
    this.updateDimensions();
  }

  render() {
    return (
      <div className="graph-container">
        <div className="help-menu"></div>
        <nav className="graph-controls">
          <span id="app-name" onClick={this.showHelp}>
            MusEx
          </span>
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
            <button type="button" id="app-help" onClick={this.showHelp}>
              Help
            </button>
          </form>
        </nav>
        {this.state.dimx === this.state.dimy ? (
          <h1>Please select two different dimensions</h1>
        ) : (
          <Graph
            enabled={true}
            zoomLevels={this.zoomLevels}
            width={this.props.graphWidth}
            height={this.props.graphHeight}
            dimx={this.state.dimx}
            dimy={this.state.dimy}
            dimensions={this.state.dimensions}
          ></Graph>
        )}
      </div>
    );
  }
}

export default GraphControl;
