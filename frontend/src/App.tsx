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
    window.alert(
      'FAQ\n'
    + '\n??Need help searching for specific genres or artists??\n--Type in the top right search bar and pick from artist or genre!'
    + '\n??Want to see stats of audio features throughout the years??\n--Try the slidebar underneath the heatmap!'
    + '\n??Want to focus only on the graph??\n--Click the three stacked bars next to the wordcloud to blend them out!'
    + '\n??Need to know how to click??\n--LeftClick -> (Un)highlight node\n--Shift + LeftClick -> Play/stop music\n--Double LeftClick -> Zooming\n')
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
            <div className="helpButton"
              id="app-help">
              <button onClick={this.onButtonClickHandler}>Help</button>
              </div>
          </nav>
        </header>
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <GraphControl sideviewExpanded={this.state.sideviewExpanded} />
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
            {/* <Widget>
              <Streamgraph
                width={window.innerWidth * (1 - this.mainViewWidthPercent) - 30}
                height={300}
              ></Streamgraph>
            </Widget> */}
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
