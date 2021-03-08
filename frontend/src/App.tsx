import React, { Component } from "react";
import ReactWordcloud from "react-wordcloud";
import axios from "axios";
import Graph from "./graph/Graph";
import { D3Graph } from "./graph/model";
import Select from "./Select";
import "./App.sass";
import { graphData, artistWords, genreWords } from "./mockdata";
import Heatmap  from './charts/heatmap/heatmap'
import Widget from './components/expandable-widget/widget'
import { tsvFormatValue } from "d3";

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
  dimensions: string[];
  showGenre: Boolean;
  showArtist: Boolean;
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
      popular_artists: [],
      dimensions: ["Danceability", "Acousticness", "Loudness"],
      showGenre: false,
      showArtist: false,
    }
    this._genreButtonClick = this._genreButtonClick.bind(this);
    this._artistButtonClick = this._artistButtonClick.bind(this);


  }

  _genreButtonClick(){
    this.setState({
      showArtist: false,
      showGenre: true,
    });
  }

  _artistButtonClick(){
    this.setState({
      showGenre: false,
      showArtist: true,
    })

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
            <span className="number">{this.state.totalA}</span>
            <span>Artists in dataset</span>
          </div>
          <div className="stat num-genres">
            <span className="number">{this.state.total}</span>
            <span>Genres in dataset</span>
          </div>
          <div className="tile artist-wordcloud">
            <Widget>
            <h3>Show wordcloud about the most popular:</h3>
            <button onClick={this._genreButtonClick}>Genres</button>
            <button onClick={this._artistButtonClick}>Artists</button>
            {this.state.showGenre ? <ReactWordcloud words={this.state.populargenres} options={options} ></ReactWordcloud> : null}
            {this.state.showArtist ? <ReactWordcloud words={this.state.popular_artists} options={options} ></ReactWordcloud> : null}
            </Widget>
          </div>
          <div className="tile genre-wordcloud">
            <Widget>
            <input
              type="text"
              placeholder="Search artist or genre"
              name="s"></input>
              <button type="submit">Search</button>
    
            </Widget>
          </div>
          <div className="heatmap-widget">
            <Widget>
            <h3>Stats through different years</h3>
            <Heatmap/>
            </Widget>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
