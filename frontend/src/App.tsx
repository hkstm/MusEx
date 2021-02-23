import React, { Component } from "react";
import ReactDOM from "react-dom";
import ReactWordcloud from "react-wordcloud";
import axios from "axios";
import * as d3 from "d3";
import logo from "./logo.svg";
import "./App.css";
import { TagCloud } from 'react-tagcloud';


// this looks good: https://spin.atomicobject.com/2017/07/20/d3-react-typescript/
const cloudsize = [60, 40];
const genre_words=[{
  text: 'Rock',
  value: 364,
},
{
  text: 'Pop',
  value: 510,
},
{
  text: 'Blues',
  value: 490,
},
{
  text: 'Latin',
  value: 390,
},
{
  text: 'R&B',
  value: 550,
},
{
  text: 'Kpop',
  value: 400,
},
{
  text: 'Afrobeat',
  value: 512,
},
{
  text: 'Cape Jazz',
  value: 222,
},
{
  text: 'African heavy metal',
  value: 433,
},
{
  text: 'Chinese rock',
  value: 555,
},
{
  text: 'Gao trance',
  value: 470,
},
{
  text: 'Indian jazz',
  value: 240,
},
{
  text: 'Lo-fi',
  value: 40,
},
{
  text: 'Gospel blues',
  value: 637,
},
{
  text: 'Electric blues',
  value: 124,
},
{
  text: 'Mambo',
  value: 450,
},
{
  text: 'Merengue',
  value: 300,
},
{
  text: 'Reggae',
  value: 700,
}];
const artist_words=[{
  text: 'The Beatles',
  value: 364,
},
{
  text: 'Elvis Presley',
  value: 510,
},
{
  text: 'Michael Jackson',
  value: 490,
},
{
  text: 'Elton John',
  value: 390,
},
{
  text: 'Madonna',
  value: 550,
},
{
  text: 'Led Zeppelin',
  value: 400,
},
{
  text: 'Rihanna',
  value: 512,
},
{
  text: 'Pink floyd',
  value: 222,
},
{
  text: 'Eminem',
  value: 433,
},
{
  text: 'Taylor Swift',
  value: 555,
},
{
  text: 'Mariah Carey',
  value: 470,
},
{
  text: 'Queen',
  value: 240,
},
{
  text: 'Celine Dion',
  value: 40,
},
{
  text: 'Whitney Houston',
  value: 637,
},
{
  text: 'AC/DC',
  value: 124,
},
{
  text: 'Drake',
  value: 450,
},
{
  text: 'Kanye west',
  value: 300,
},
{
  text: 'Justin Bieber',
  value: 700,
}];

const options = {
  colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
  enableTooltip: true,
  deterministic: false,
  fontFamily: "impact",
  fontStyle: "normal",
  fontWeight: "normal",
  padding: 1,
  rotations: 0,
  transitionDuration: 1000
};

type AppState = {
  data: string[];
};

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: [],
    };
  }

  componentDidMount() {
    axios.get(`http://localhost:5000/data`).then((res) => {
      this.setState({ data: res.data });
    });
  };

  render() {
    d3.select("svg")
      .append("circle")
      .attr("r", 50)
      .attr("cx", 100)
      .attr("cy", 100)
      .attr("fill", "red");

    console.log(this.state.data);
    const items = this.state.data.map((char) => <li key={char}>{char}</li>);

    return (
      <div className="Parent">
        <div className="Title"><h1>Insert project title!</h1></div>
        
        <div className="mainPlot"></div>
        <div className="StatA">

        </div>
        <div className="StatGenres">

        </div>
        <div className="WordCloudArtists">
        <h3>Artists ranked by popularity</h3>
        <ReactWordcloud   
  
          words={artist_words}
          options={options}
          /> 
        </div>
        <div className="WordCloudGenre">
        <h3>Genres ranked by popularity</h3>
         <ReactWordcloud   
        
          words={genre_words}
          options={options}
          /> 
        </div>
      </div>

    );
  
}};

export default App;
