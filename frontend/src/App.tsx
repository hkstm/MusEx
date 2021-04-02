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
  sideviewExpanded: boolean;
};

class App extends Component<{}, AppState> {
  mainViewWidthPercent = 0.6;

  constructor(props: {}) {
    super(props);
    this.state = {
      sideviewExpanded: true,
    };
  }

  toggleSideview = () => {
    this.setState((state) => {
      return { sideviewExpanded: !state.sideviewExpanded };
    });
  };

  render() {
    return (
      <div className="app">
        <div id="content">
          <div
            className={this.state.sideviewExpanded ? "expanded" : ""}
            id="main-view"
          >
            <GraphControl 
              graphHeight={window.innerHeight - 40}
              graphWidth={
                window.innerWidth *
                (this.state.sideviewExpanded ? this.mainViewWidthPercent : 1.0)
              }
            ></GraphControl>
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
              <Heatmap></Heatmap>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
