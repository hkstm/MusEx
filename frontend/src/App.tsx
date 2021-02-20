import React, { Component } from "react";
import axios from "axios";
import * as d3 from "d3";
import logo from "./logo.svg";
import "./App.css";

// this looks good: https://spin.atomicobject.com/2017/07/20/d3-react-typescript/

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
  }

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
        <div className="StatA"></div>
        <div className="StatGenres"></div>
        <div className="WordCloudArtists"></div>
        <div className="WordCloudGenre"></div>
      </div>

    );
  }
}

export default App;
