import React, { Component } from "react";
import axios from "axios";
import Graph from "./graph/Graph";
import { D3Graph } from "./graph/graph";
import Select from "./Select";
import "./App.sass";
import data from "./mockdata";

type AppState = {
  data: string[];
  graph?: D3Graph;
  dimensions: string[];
};

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      dimensions: ["Danceability", "Acousticness", "Loudness"],
      data: [],
    };
  }

  componentDidMount() {
    axios.get(`http://localhost:5000/data`).then((res) => {
      this.setState({ data: res.data });
    });
  }

  render() {
    // console.log(this.state.data);
    // const items = this.state.data.map((char) => <li key={char}>{char}</li>);
    return (
      <div className="App">
        <header>
          <nav>
            <span id="app-name">MusEx</span>
            <div className="dimension-controller">
              <Select
                id="select-first-dim"
                options={this.state.dimensions}
              ></Select>
              <Select
                id="select-second-dim"
                options={this.state.dimensions}
              ></Select>
            </div>
          </nav>
        </header>
        <div id="content">
          <Graph
            width={window.innerWidth}
            height={window.innerHeight - 40}
            data={data}
          ></Graph>
        </div>
      </div>
    );
  }
}

export default App;
