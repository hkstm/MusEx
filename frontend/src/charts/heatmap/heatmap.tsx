import React, { Component } from "react";
import * as d3 from "d3";
import "./heatmap.css";

class Heatmap extends Component {
  constructor(props: {}) {
    super(props);
    this.state = {
      data: [],
    };
  }

  componentDidMount() {
    setTimeout(this.d3heatmap, 0)
  }

  d3heatmap() {
    var margin = {top: 30, right: 30, bottom: 30, left: 30},
    width = 160 - margin.left - margin.right,
    height = 160 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select("#heatmap-svg")
    .append("svg")
      .attr("width", width + 2 * (margin.left + margin.right))
      .attr("height", height + 2 * (margin.top + margin.bottom))
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

    var myColor = function(n: number) {var shade = n * 2.55; return `rgb(${0}, ${0}, ${shade})`}

    const buildData = () => {
      let array: any = []
      myVars.map((d) => {
        const o = myGroups.map((t) => ({
          t: t,
          n: d,
          value: Math.floor(Math.random() * 100)
        }))
        array = [...array,...o]
      })
      return array;
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
      debugger;
      tooltip
        .html(data.value + " " + data.t + " records sold in " + data.n)
        // .style("left", (d.clientX + 20) + "px")
        // .style("top", (d.clientY) + "px")
        // .style("left", (d3.pointer(this)[0]+70) + "px")
        // .style("top", (d3.pointer(this)[1]) + "px")
      }
    var mouseleave = function(d: any) {
      tooltip.style("opacity", 0)
    }

    // add the squares
    svg.selectAll()
      .data(data, function(d:any) { return d.t+':'+d.n;})
      .enter()
      .append("rect")
        .attr("x", function(d:any) { return x(d.t) })//d.group
        .attr("y", function(d:any) { return y(d.n) })//d.variable
        .attr("width", x.bandwidth() )
        .attr("height", y.bandwidth() )
        .style("fill", function(d) { return myColor(d.value)} )
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)
  }

  render() {
    return (
        <div className="heatmap-container">
          <svg id="heatmap-svg"></svg>
        </div>
    );
  }
}

export default Heatmap;
