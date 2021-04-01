import React, { Component } from "react";
import * as d3 from "d3";
import "./Streamgraph.sass";
import { clip } from "../../utils";

export type StreamgraphStream = {
  [key: string]: number;
  // [key: string]: {
  // color: string;
  // name: string;
  // popularity: number;
  year: number;
};

type StreamgraphProps = {
  enabled?: boolean;
  width?: number;
  height?: number;
  keys: string[];
  data: StreamgraphStream[];
};

type StreamgraphState = {};

class Streamgraph extends Component<StreamgraphProps, StreamgraphState> {
  svg!: d3.Selection<SVGSVGElement, StreamgraphStream[], HTMLElement, any>;

  constructor(props: StreamgraphProps) {
    super(props);
    this.state = {
      data: [],
    };
  }

  componentDidMount() {
    this.addStreamgraph();
    this.updateStreamgraph();
  }

  componentDidUpdate(prevProps: StreamgraphProps) {
    if (
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height ||
      prevProps.data !== this.props.data
    ) {
      this.updateStreamgraph();
    }
  }

  addStreamgraph = () => {
    if (this.props.enabled === true) return;
    this.svg = d3
      .select<SVGSVGElement, StreamgraphStream[]>("#streamgraph")
      .append("svg")
      .attr("width", this.props.width ?? 100)
      .attr("height", this.props.height ?? 100);
  };

  updateStreamgraph = () => {
    if (this.props.enabled === true) return;
    if (!this.props.data) return;
    // const keys = [
    //   "AE",
    //   "AREN",
    //   "BBT",
    //   "BC",
    //   "BME",
    //   "CE",
    //   "CH",
    //   "CM",
    //   "CS",
    //   "ECE",
    //   "EV",
    //   "HU",
    //   "ID",
    //   "IE",
    //   "IMGD",
    //   "MA",
    //   "ME",
    //   "MG",
    //   "PH",
    //   "RBE",
    //   "SSPS",
    // ];
    // const data = Array(10)
    //   .fill(0)
    //   .map((_, wi) => {
    //     let sample = {
    //       year: new Date(wi, 0, 1),
    //       // test: Math.random() * 100 * this.props.height
    //     };
    //     keys.forEach((v, idx) => {
    //       sample[v] = idx;
    //     });
    //     return sample;
    //   });

    // const data = this.props.data.map((d) => {
    //   d.year = new Date(d.year, 0, 1);
    //   return d;
    // });
    //
    // const data = this.props.data.map((d) => {
    //   d.year = new Date(d.year, 0, 1);
    //   this.props.keys.forEach((k) => {
    //     d[k] = d[k].popularity;
    //   });
    //   return d;
    // });

    console.log("this is streamgraph data", this.props.data);
    // console.log("this is streamgraph data", data);
    // return;

    // const keys = Object.keys(Object.values(this.props.data)[0]);
    // const keys = this.props.keys;
    // console.log(this.props.keys);

    const stack = d3
      .stack()
      .keys(this.props.keys)
      .order(d3.stackOrderInsideOut)
      // .order(d3.stackOrderNone)
      .offset(d3.stackOffsetWiggle);

    const series = stack(this.props.data);

    // const x = d3
    //   .scaleLinear()
    //   .domain(d3.extent<StreamgraphStream, string>(this.props.data, (d: StreamgraphStream) => new Date(d.year, 0, 1)))
    //   .range([0, this.props.width]);

    // // setup axis
    // const xAxis = d3.axisBottom(x);

    // const y = d3
    //   .scaleLinear()
    //   .domain([
    //     d3.min(series, (d) => d3.min(d, (d) => d[0])),
    //     d3.max(series, (d) => d3.max(d, (d) => d[1])),
    //   ])
    //   // .domain([0, d3.max(series, (layer) => {
    //   //   // console.log(layer);
    //   //   return d3.max(layer, (d) => d[0] + d[1]);
    //   // })])
    //   .range([0, 200]);
    // // .range([this.props.height / 2, -200]);

    // // const color = d3.scaleLinear().range(["#51D0D7", "#31B5BB"]);
    // // const color = d3.scaleOrdinal(d3.schemeCategory10);

    // const tooltip = d3
    //   // .select(".streamgraph-container")
    //   .select("body")
    //   .append("div")
    //   .attr("class", "tooltip");

    // this.svg
    //   .selectAll("path")
    //   .data(series)
    //   .enter()
    //   .append("path")
    //   .attr("d", d3.area()
    //     .x((d) => {
    //       console.log(d);
    //       return x(d.data.year);
    //       // return x(new Date(d.data.year, 0, 1));
    //     })
    //     .y0((d) => y(d[0]))
    //     .y1((d) => y(d[0] + d[1]))
    //   );
    // .curve(d3.curveBasis);
    // .style("fill", () => color(Math.random()))
    // .on("mouseover", function (event: MouseEvent, d: StreamgraphData) {
    //   console.log(event);
    //   d3.select(this).style(
    //     "fill",
    //     d3.rgb(d3.select(this).style("fill")).brighter()
    //   );
    //   d3.select("#major").text(d.key);
    //   tooltip.transition().duration(700).style("opacity", 1);
    //   tooltip
    //     .html(d.year)
    //     .style("left", event.pageX + 5 + "px")
    //     .style("top", event.pageY - 28 + "px");
    // })
    // .on("mouseout", function (d) {
    //   d3.select(this).style(
    //     "fill",
    //     d3.rgb(d3.select(this).style("fill")).darker()
    //   );
    //   d3.select("#major").text("Mouse over");
    //   tooltip.transition().duration(500).style("opacity", 0);
    // });

    // this.svg
    //   .append("g")
    //   .attr("class", "streamgraph.x.axis")
    //   .attr("transform", "translate(0," + this.props.height + ")")
    //   .call(xAxis);

    // this.svg.append("g").call(xAxis);
  };

  render() {
    return (
      <div className="streamgraph-container">
        <div id="streamgraph" className="streamgraph"></div>
      </div>
    );
  }
}

export default Streamgraph;
