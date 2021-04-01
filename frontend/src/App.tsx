import React, { Component } from "react";
import axios from "axios";
import { headerConfig, apiVersion } from "./common";
import Graph, { GraphDataDimensions } from "./graph/Graph";
import GraphControl from "./graph/GraphControls";
import Select from "./Select";
import Heatmap from "./charts/musicheatmap/heatmap";
import Wordcloud from "./charts/wordcloud/Wordcloud";
import Streamgraph from "./charts/streamgraph/Streamgraph";
import "./App.sass";

import Widget from "./components/expandable-widget/widget";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

type AppState = {
  dimensions: GraphDataDimensions;
  dimx?: string;
  dimy?: string;
  sideviewExpanded: boolean;
  searchQuery: string;
  searchType: string;
};

class App extends Component<{}, AppState> {
  mainViewWidthPercent = 0.6;
  zoomLevels = 5;

  constructor(props: {}) {
    super(props);
    this.state = {
      dimensions: {},
      sideviewExpanded: true,
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

  // handleZoom = (zoom: number) => {
  //   const zoomLevel = Math.floor(zoom);
  //   const levelType = this.levels[Math.min(zoomLevel, this.levels.length - 1)];
  //   // console.log("zoom changed to", zoom, zoomLevel, levelType);
  //   // TODO: make this a lot smarter please!
  //   this.setState({ zoom: zoom - zoomLevel, zoomLevel, levelType }, () => {
  //     if (
  //       this.lastUpdate &&
  //       (Math.abs(this.lastUpdate.zoom - (zoom - zoomLevel)) >=
  //         1 / this.zoomLevels ||
  //         this.lastUpdate.levelType !== levelType)
  //     )
  //       console.log("trigger zoom based update");
  //     // this.updateGraph();
  //   });
  // };

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

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
    });
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

  render() {
    return (
      <div className="app">
        <header>
          <nav>
            <div className="controls">
              <span id="app-name">MusEx</span>
            </div>
          </nav>
        </header>
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <GraphControl sideviewExpanded={this.state.sideviewExpanded}/>
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
              <Wordcloud></Wordcloud>
            </Widget>
            <Widget>
              <Streamgraph
                width={window.innerWidth * (1 - this.mainViewWidthPercent) - 30}
                height={300}
              ></Streamgraph>
            </Widget>
            <Widget>
              <h3>Evolution of musical features</h3>
              <Heatmap apiVersion={apiVersion}></Heatmap>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
