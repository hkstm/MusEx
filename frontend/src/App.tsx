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
};

type Genre = {
  text: string;  // converted name to text for the wordcloud
  value: number; // converted  popularity to value for the wordcloud
};

type AppState = {
  genres: Genre[];
  total: number
  populargenres: Genre[]
  artists: Genre[]
  totalA: string
  popular_artists: Genre[]
};

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      genres: [],
      total: 0,
      populargenres:[],
      artists:[],
      totalA : '',
      popular_artists: []

    };
  }

  componentDidMount() {
    axios.get(`http://localhost:5000/genres`).then((res) => {
      this.setState({ genres: res.data.genres, total: res.data.total, populargenres: res.data.populargenres,
      });
    });

    axios.get(`http://localhost:5000/artists`).then((res)=>{
      this.setState({artists: res.data.artists, totalA: res.data.total_artists, popular_artists: res.data.popular_artists })
    })
  };

 
  render() {
  

    return (
      <div className="App">
        <header>
          <nav>
            <span id="app-name">MusEx</span>
            <div className="dimension-controller">

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
            <span className="number">{this.state.totalA}</span>
            <span>Artists in dataset</span>
          </div>
          <div className="stat num-genres">
            <span className="number">{this.state.total}</span>
            <span>Genres in dataset</span>
          </div>
          <div className="tile artist-wordcloud">
            <h3>Most popular artists</h3>
            <ReactWordcloud words={this.state.popular_artists} options={options} />
          </div>
          <div className="tile genre-wordcloud">
            <h3>Most popular genres</h3>
            <ReactWordcloud words={this.state.populargenres} options={options} />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
