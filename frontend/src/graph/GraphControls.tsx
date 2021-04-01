import React, { Component } from "react";
import axios from "axios";
import { headerConfig, apiVersion } from "../common";
import Graph, { GraphDataDimensions } from "./Graph";
import Select from "../Select";
import "./GraphControls.sass";

type GraphControlState = {
  dimensions: GraphDataDimensions;
  dimx?: string;
  dimy?: string;
  searchQuery: string;
  searchType: string;
};

class GraphControl extends Component<{sideviewExpanded: boolean}, GraphControlState> {
  mainViewWidthPercent = 0.6;
  zoomLevels = 5;

  constructor(props: {sideviewExpanded: true}) {
    super(props);
    this.state = {
      dimensions: {},
      searchQuery: "",
      searchType: "artist",
    };
  }

  onButtonClickHandler = () => {
    window.alert("Help!");
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

  search = (event?: React.FormEvent<HTMLFormElement>) => () => {
    console.log("searching");
    event?.preventDefault();
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
        <div className="graph-controls">
          <div className="dimensions">
            <Select
              id="select-dimx"
              default="energy"
              onChange={this.handleDimXChange}
              options={this.state.dimensions}>
            </Select>
            <Select
              id="select-dimy"
              default="tempo"
              onChange={this.handleDimYChange}
              options={this.state.dimensions}
              >
            </Select>
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
              options={{ artist: {}, genre: {} }}>
            </Select>
            <button id="app-search" type="submit">
              Search
            </button>
            <button id="app-help" onClick={this.onButtonClickHandler}>
              Help
            </button>
          </form>
        </div>
        {this.state.dimx === this.state.dimy ? 
          (<h1>Please select two different dimensions</h1>) 
          : (
                <Graph
                  enabled={true}
                  zoomLevels={this.zoomLevels}
                  width={
                    window.innerWidth *
                      (this.props.sideviewExpanded
                        ? this.mainViewWidthPercent
                        : 1.0) -
                    30
                  }
                  height={window.innerHeight - 40}
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
