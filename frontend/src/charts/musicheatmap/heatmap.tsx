import React, { Component } from "react";
import * as d3 from "d3";
import axios from "axios";
import Slider from "../../components/slider/Slider";
import "./heatmap.sass";
import "./heatmap-animate.css";

// type Year = {
//   acousticness: number,
//   danceability: number,
//   duration_ms: number,
//   energy: number,
//   instrumentalness: number,
//   liveness: number,
//   loudness: number,
//   popularity: number,
//   speechiness: number,
//   tempo: number,
//   valence: number,
//   year: number
// }

class MusicHeatmap extends Component<{apiVersion: string}, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      x: [],
      y: [],
      yearsCount: 10,
      max: {}, //currentMin
      min: {}, //currentMax
      hash: {
        acousticness: { max: 0.996, min: 0.0 },
        danceability: { max: 0.988, min: 0.0 },
        duration_ms: { max: 5338302, min: 4937 },
        energy: { max: 1.0, min: 0.0 },
        explicit: { max: 1, min: 0 },
        instrumentalness: { max: 1.0, min: 0.0 },
        key: { max: 11, min: 0 },
        liveness: { max: 1.0, min: 0.0 },
        loudness: { max: 3.855, min: -60.0 },
        mode: { max: 1, min: 0 },
        popularity: { max: 100, min: 0 },
        speechiness: { max: 0.971, min: 0.0 },
        tempo: { max: 243.507, min: 0.0 },
        valence: { max: 1.0, min: 0.0 },
        year: { max: 2021, min: 1920 },
      },
    };
    this.setAxes = this.setAxes.bind(this);
    this.getData();
  }

  getData() {
    axios.get(`http://localhost:5000/${this.props.apiVersion}/years?limit=200`).then((res)=>{
      this.setState({data: res.data.data}, ()=> {
        this.setAxes(res.data.data, 40);
      })
    });
  }

  setAxes (data:any[], sliderValue: number = 80 ) {
    const yearsLimit = Math.floor(sliderValue / 200 * 50);
    let years = (data.sort((a: any,b: any) => a.year > b.year ? 1 : -1))
    years = years.slice(data.length - yearsLimit);
    var x:number[] = [], y:any[] = [];
    var min: any = this.state.min, max: any = this.state.max;
    years.forEach((d:any) => {
      x.push(d.year);
      const {year, loudness, duration_ms, ...info} = d;
      Object.keys(d).forEach((k:any) => {
        if (!max[k] || max[k] < d[k])
          max[k] = d[k]
        if (!min[k] || min[k] > d[k])
          min[k] = d[k]
      });
      y.push(info);
    })
    const heatmapGrid = document.querySelector('.heatmap-grid');
    this.setState({x, y, min, max, yearsLimit});
  }

  drawLegend() {
    return (
      <div className="heatmap-legend">
        <div className="heatmap-gradient-legend" />
        <div className="heatmap-legend-lowval">Min Value</div>
        <div className="heatmap-legend-highval">Max Value</div>
      </div>
    );
  }

  getShade(key: string, val: number) {
    // var min = this.state.min[key] / 1.2, max = this.state.max[key] * 1.2;
    var min = this.state.hash[key].min,
      max = this.state.hash[key].max;
    var range = max - min;
    var shade = (255 * (val - min)) / range;
    return `rgb(${255 - shade + "," + (255 - shade) + "," + (255 - shade)})`;
  }

  draw() {
    const roundOff: number = (this.state.yearsLimit >= 20 ? 5 : 2);
    return (
      <div className="heatmap-grid">
        {Object.keys(this.state.y[0] || {}).map((key: string) => (
          <div className="heatmap-row">
            <div className="heatmap-tick-y">
              {key}
              <div className="y-tooltip">
                {" "}
                {key} Range[{this.state.hash[key].min},
                {this.state.hash[key].max}]
              </div>
            </div>
            {this.state.x.map((year: any, i: number) => (
                <div
                  className={"heatmap-cell " + "animation-cell-"+ Math.ceil(Math.random()*5)} style={{
                    background: this.getShade(key, this.state.y[i][key]),
                  }}
                >
                  <div className="heatmap-cell-tooltip">
                    {`${key} in ${year} is ${this.state.y[i][key].toFixed(3)}`}
                  </div>
                </div>
            ))}
          </div>
        ))}
        <div className="heatmap-row">
          <div className="heatmap-tick-y" />
          {this.state.x.map((year: any, i: number) => (
            <div className="heatmap-tick">
              {year % roundOff == 0 ? year : '' }
            </div>
          ))}
        </div>
      </div>
    );
  }

  updateHeatmap(sliderValue: number){
    this.setAxes(this.state.data, sliderValue);
  }

  render() {
    return (
      <div className="heatmap-container">
        {this.draw()}
        {this.drawLegend()}
        <Slider id="heatmap" min={40} onUpdate={(n:number)=>{this.updateHeatmap(n);}}/>
          <div className="hm-slider-label">Show last {this.state.yearsLimit} years</div>
      </div>
    );
  }
}

export default MusicHeatmap;
