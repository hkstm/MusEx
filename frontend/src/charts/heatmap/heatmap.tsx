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

    // Build Y scales and axis:
    var y:any = d3.scaleBand()
      .range([ height, 0 ])
      .domain(myVars)
      .padding(0.01);
    svg.append("g")
      .call(d3.axisLeft(y));

    // Build color scale
    // var myColor = d3.scaleLinear()
    //   .range([0, 600]) //.range(["white", "#69b3a2"])  //imgur.com/a/MXoOMfN
    //   .domain([1,100])
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

    // create a tooltip
    var tooltip = d3.select(".heatmap-container")
      .append("div")
      .style("opacity", 0)
      .attr("class", "heatmap-tooltip")

    // Three function that change the tooltip when user hover / move / leave a cell
    // var mouse:any = function(event: any) { return d3.pointer(event) };
    // var that: any = this;
    var mouseover = function(d: any) {
      tooltip.style("opacity", 1)
    }
    var mousemove = function(d: any, data: any) {
      debugger;
      tooltip
        .html(data.value + " " + data.t + " records sold in " + data.n)
        // .style("left", (d.clientX + 20) + "px")
        // .style("top", (d.clientY) + "px")
        // .style("left", (mouse(that)[0]+70) + "px")
        // .style("top", (mouse(that)[1]) + "px")
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

  // TODO _ CHECk Observablehq implementation
  // heatmap(){
  //   const height = 500, width = 700;

  //   const color_scale = d3.scaleLinear()
  //     .domain([0, 100])
  //     .range([0, 600]);
  //     // .range(['#fff', '#A3320B']);

  //   const types = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  //   const buildData = () => {
  //     let array: any = []
  //     d3.range(10).map((d) => {
  //       const o = types.map((t) => ({
  //         t: t,
  //         n: d,
  //         value: Math.random() * 100
  //       }))
  //       array = [...array,...o]
  //     })
  //     return array;
  //   }

  //   const data = buildData();

  //   // const y_scale = d3.scaleBand().domain([1,10]).range([height, 0]);
  //   // const y_scale = d3.scaleBand().domain([1,2,3,4,5,6,7,8,9,10]).range([height, 0]);
  //   const y_scale = d3.scaleBand().domain(['1','2','3','4','5','6','7','8','9','10']).range([height, 0]);
  //   // const y_scale = d3.scaleBand().domain(["1","2","3","4","5","6","7","8","9","10"]).range([height, 0]);
  //   // const y_scale = d3.scaleBand().domain(d3.range(10)).range([height, 0]);

  //   const x_scale: any = d3.scaleBand()
  //   .domain(types)
  //   .range([0, width]);

  //   const margin = ({ top: 50, left: 40, right: 40, bottom: 50 });
  //   // const height = 500;

  //       // var chart = {
  //         const svg = d3.select("#heatmap-svg")
  //         // const svg = d3.select(DOM.svg(width, height))
  //         const g = svg.attr('width', width - margin.left)
  //          .attr('height', height + margin.top + margin.bottom)
  //          .append('g')
  //          .attr('transform', 'translate(' + margin.left + ', 0)')
          
  //         g.append('g')
  //           .attr('transform', 'translate(0,' +  height +')')
  //           .call(d3.axisBottom(x_scale))
  //         g.append('g')
  //           .call(d3.axisLeft(y_scale))
          
  //         svg.selectAll()
  //           .data(data)
  //           .enter()
  //           .append('rect')
  //           .attr('x', (d: any) => {if (!x_scale) {return margin.left;} else return x_scale(d?.t) + margin.left})
  //           // .attr('y', (d) => y_scale(d.n))
  //           .attr('width', x_scale.bandwidth())
  //           .attr('height', (d) => 50)
  //           .attr('fill', (d: any) => color_scale(d?.value))
          
  //         // return svg.node()
  //       // };
  // }




  render() {
    return (
        <div className="heatmap-container">
          <svg id="heatmap-svg"></svg>
        </div>
    );
  }
}

export default Heatmap;
