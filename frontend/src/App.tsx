import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import axios from "axios";
import Graph from "./graph/Graph";
import { D3Graph } from "./graph/model";
import Select from "./Select";
import "./App.sass";
import { graphData, artistWords, genreWords } from "./mockdata";

const options = {
  colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
  enableTooltip: true,
  deterministic: false,
  fontFamily: "impact",
  fontStyle: "normal",
  fontWeight: "normal",
  padding: 1,
  rotations: 0,
  transitionDuration: 1000,
};

type Genre = {
  name: string;
  popularity: number;
};

type AppState = {
  genres: Genre[];
  data: string[];
  graph?: D3Graph;
  dimensions: string[];
};

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      genres: [],
      dimensions: ["Danceability", "Acousticness", "Loudness"],
      data: [],
    };
  }

  componentDidMount() {
    axios.get(`http://localhost:5000/genres?limit=100`).then((res) => {
      this.setState({ genres: res.data });
    });
  }

  render() {
    console.log(this.state.genres);
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
          <div className="tile graph">
            <Graph
              enabled={true}
              width={window.innerWidth}
              height={window.innerHeight - 40}
              data={graphData}
            ></Graph>
          </div>
          <div className="stat num-artists">
            <span className="number">80</span>
            <span>Artists in dataset</span>
          </div>
          <div className="stat num-genres">
            <span className="number">26</span>
            <span>Genres in dataset</span>
          </div>
          <div className="tile artist-wordcloud">
            <h3>Artists ranked by popularity</h3>
            <ReactWordcloud words={artistWords} options={options} />
          </div>
          <div className="tile genre-wordcloud">
            <h3>Genres ranked by popularity</h3>
            <ReactWordcloud words={genreWords} options={options} />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
