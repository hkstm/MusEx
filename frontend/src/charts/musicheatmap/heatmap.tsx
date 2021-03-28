import React, { Component } from "react";
import * as d3 from "d3";
import axios from 'axios';
import "./heatmap.css";

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

class Heatmap extends Component<{}, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      x: [],
      y: [],
      yearsCount: 10,
      max: {}, //currentMin
      min: {}, //currentMax
      hash: {
        "acousticness": {"max": 0.996, "min": 0.0},
        "danceability": {"max": 0.988, "min": 0.0},
        "duration_ms": {"max": 5338302, "min": 4937},
        "energy": {"max": 1.0, "min": 0.0},
        "explicit": {"max": 1, "min": 0},
        "instrumentalness": {"max": 1.0, "min": 0.0},
        "key": {"max": 11, "min": 0},
        "liveness": {"max": 1.0, "min": 0.0},
        "loudness": {"max": 3.855, "min": -60.0},
        "mode": {"max": 1, "min": 0},
        "popularity": {"max": 100, "min": 0},
        "speechiness": {"max": 0.971, "min": 0.0},
        "tempo": {"max": 243.507, "min": 0.0},
        "valence": {"max": 1.0, "min": 0.0},
        "year": {"max": 2021, "min": 1920},
      }
    };
    this.updateXAxis = this.updateXAxis.bind(this);
    this.getData();
  }

  componentDidUpdate(prevProps:any, prevState:any) {
    if (this.state.yearsCount !== prevState.yearsCount)
     this.getData();
  }

  getData() {
    // setTimeout(this.d3heatmap, 0);
    axios.get(`http://localhost:5000/years?limit=${this.state.yearsCount}`).then((res) => {
      res.data.data = res.data.data.sort((a: any,b: any) => a.year > b.year ? 1 : -1);
      this.setState({ data: res.data.data });
      var x:number[] = [], y:any[] = [];
      var min: any = this.state.min, max: any = this.state.max;
      res.data.data.forEach((d:any) => {
        x.push(d.year);
        var info = d;
        delete info['year'];
        delete info['loudness'];
        delete info['duration_ms'];

        // Set 2 cells to min/max shade
        // var maxKey = Object.keys(d)[Math.floor(Math.random() * Object.keys(d).length)];
        // info[maxKey] = this.state.hash[maxKey].max;
        // var minKey = Object.keys(d)[Math.floor(Math.random() * Object.keys(d).length)];
        // info[minKey] = this.state.hash[minKey].min;

        Object.keys(d).forEach((k:any) => {
          if (!max[k] || max[k] < d[k])
            max[k] = d[k]          
          if (!min[k] || min[k] > d[k])
            min[k] = d[k]
        });
        y.push(info);
      })
      this.setState({x, y, min, max})
    });

  }

  d3heatmap() {
    var margin = {top: 60, right: 60, bottom: 60, left: 60},
    width = 480 - margin.left - margin.right,
    height = 480 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#heatmap-svg")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

   // Labels of row and columns
    var myGroups = ["Country", "Rock", "Metal", "Hip hop", "Pop", "Jazz", "Rap", "R&B", "Alternative Rock", "Pop Rock"]
    var myVars = ["2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010"]

    // Build X scales and axis:
    var x:any = d3.scaleBand()
      .range([ 0, width ])
      .domain(myGroups)
      .padding(0.01);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x))

    var y:any = d3.scaleBand()
      .range([ height, 0 ])
      .domain(myVars)
      .padding(0.01);
    svg.append("g")
      .call(d3.axisLeft(y));

    var myColor = function(n: number) {var shade = n * 2.55; return `rgb(${255- shade}, ${255-shade}, ${255})`}

    const buildData = () => {
      return myVars.reduce((acc, d) => {
        const o = myGroups.map((t) => ({
          t: t,
          n: d,
          value: Math.floor(Math.random() * 100)
        }))
        acc.push(o);
        return acc;
      }, [] as any[])
  }

    const data = buildData();

    var tooltip = d3.select(".heatmap-container")
      .append("div")
      .style("opacity", 0)
      .attr("class", "heatmap-tooltip")

    var mouseover = function(d: any) {
      tooltip.style("opacity", 1)
    }
    var mousemove = function(d: any, data: any) {
      tooltip
        .html(data.value + " " + data.t + " records sold in " + data.n)
        .style("left", (d.clientX + 20) + "px")
        .style("top", (d.clientY - 150) + "px")
        // .style("left", (d3.pointer(this)[0]+70) + "px")
        // .style("top", (d3.pointer(this)[1]) + "px")
      }
    var mouseleave = function(d: any) {
      tooltip.style("opacity", 0)
    }

    // add the squares
    svg.selectAll()
      .data(data, function(d:any) { return d.t+':'+d.n;})
      // .data(data, function(d:any, i:any, j: any) { debugger;return d[0].t+','+d[0].n;})
      .enter()
      .append("rect")
        .attr("x", function(d:any) { return x(d.t) })//d.group
        .attr("y", function(d:any) { return y(d.n) })//d.variable
        // .attr("x", function(d:any, i:any, j:any) { return x(d[i].t) })//d.group
        // .attr("y", function(d:any, i:any, j: any) { return y(d[i].n) })//d.variable
        .attr("width", x.bandwidth() )
        .attr("height", y.bandwidth() )
        .style("fill", "white" )
        // .style("fill", function(d) { return myColor(d.value)} )
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)   
      .transition() // and apply changes to all of them
        .duration(500)
        .style("fill", function(d) { return myColor(d.value)} )
        // .style("fill", function(d:any,i:any) { return myColor(d[i].value)} )
  }

  drawLegend() {
    return (
      <div className="heatmap-legend">
        <div className="heatmap-gradient-legend"/>
        <div className="heatmap-legend-lowval">Min Value</div>
        <div className="heatmap-legend-highval">Max Value</div>
      </div>
    );
  }

  updateXAxis(e: any){
    console.log('clicked at ', e.clientX);
    let yearsCount: number = (Math.round((e.clientX - 660)/40) * 10) || 10;
    this.setState({yearsCount});
  }

  sliderBar() {
    return (
      <div className="hm-slider-bar" onClick={this.updateXAxis}>
        <div className="hm-slider-stick" style={{left: (this.state.yearsCount *4) + "px"}}/>
        <div className="hm-slider-label">Show last {this.state.yearsCount} years</div>
      </div>
    );
  }

  getShade(key:string, val:number) {
    // var min = this.state.min[key] / 1.2, max = this.state.max[key] * 1.2;
    var min = this.state.hash[key].min, max = this.state.hash[key].max;
    var range = max - min;
    var shade = 255 * (val - min) / (range)
    return `rgb(${(255) + ',' + (255-shade) + ',' + (255-shade)})`  
  }
  
  draw() {
    return (
      <div className="heatmap-grid">
        {Object.keys(this.state.y[0] || {}).map( (key:string) => 
          <div className='heatmap-row'>
            <div className="heatmap-tick-y">
              {key}
              <div className="y-tooltip"> {key} Range[{this.state.hash[key].min},{this.state.hash[key].max}]</div>
            </div>
            {this.state.x.map( (year:any, i: number) => 
              <div className='heatmap-row'>
                <div className="heatmap-cell" style={{background: this.getShade(key, this.state.y[i][key])}}>
                  <div className="heatmap-cell-tooltip"> {`${key} in ${year} is ${this.state.y[i][key].toFixed(3)}`}</div>
                </div> 
              </div>
              )}
          </div>
        )}
        <div className='heatmap-row'>
          <div className="heatmap-tick-y"/>
          {this.state.x.map( (year:any, i: number) => 
              <div className="heatmap-tick"> {year} </div>
          )}
        </div>
    </div>
)
  }

  render() {
    // return <div>{this.draw()}</div>;
    return (
        <div className="heatmap-container">
          {/* <svg id="heatmap-svg"></svg> */}
          {this.draw()}
          {this.drawLegend()}
          {this.sliderBar()}
        </div>
    );
  }
}

export default Heatmap;
