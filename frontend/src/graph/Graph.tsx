import * as React from "react";
import * as d3 from "d3";
import { D3Graph, D3Node } from "./model";
import "./Graph.sass";
import {Simulate} from "react-dom/test-utils";
import {graphData} from "../mockdata";

interface GraphProps {
  enabled: boolean;
  width: number;
  height: number;
  data: D3Graph;
}

interface GraphState {
  zoomLevel: number;
}

type SimNode = D3Node;
type SimLink = d3.SimulationLinkDatum<D3Node>;

export default class Graph extends React.Component<GraphProps, GraphState> {
  ref!: HTMLDivElement;
  svg!: d3.Selection<SVGSVGElement, D3Graph, null, any>;
  graph!: d3.Selection<SVGGElement, D3Graph, null, any>;
  force: any;

  constructor(props: GraphProps) {
    super(props);
    this.state = {
      zoomLevel: 1
    };
  }

  componentDidMount() {
    if (!this.props.enabled) return;
    this.svg = d3
      .select<HTMLDivElement, D3Graph>(this.ref)
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.graph = this.svg
      .append("g")
      .attr("class", "graph")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    // Create scale
    const scale = d3.scaleLinear().domain([0, 1.0]); // axis labels
    const x_scale = scale.range([40, this.props.width - 10]);
    const y_scale = scale.range([100, this.props.height - 10]);

    // Add scales to axis
    const x_axis = d3.axisBottom(x_scale);
    const y_axis = d3.axisLeft(y_scale);

    this.svg
      .append("g")
      .attr("transform", `translate(0,${this.props.height - 30})`)
      .call(x_axis);

    this.svg.append("g").attr("transform", "translate(30,0)").call(y_axis);

    const zoom = d3
      .zoom<SVGSVGElement, D3Graph>()
      .on("zoom", (event) => {
        this.graph.attr("transform", event.transform);
        // console.log(event);
        this.setState({zoomLevel: event.transform.k});
      });
      // .scaleExtent([1, 40]);

    this.svg.call(zoom);

    const forceLink = d3
      .forceLink<SimNode, SimLink>(this.props.data.links)
      .id((d: D3Node) => {
        return d.id;
      })
      .distance(50)
      .links(this.props.data.links);

    const force = d3
      .forceSimulation<SimNode, SimLink>(this.props.data.nodes)
      .nodes(this.props.data.nodes)
      .force("link", forceLink)
      .force("charge", d3.forceManyBody().strength(-120))
      .force(
        "center",
        d3.forceCenter(this.props.width / 2, this.props.height / 2)
      );

    const labels = this.graph
      .append("g")
      .attr("class", "labels")
      .selectAll(".labels")
      .data(this.props.data.nodes)
      .enter()
      .append<SVGTextElement>("text")
      .attr("class", "label")
      .attr("fill", "white")
      .text((d) => d.id);

    const links = this.graph
      .append("g")
      .selectAll("line")
      .data(this.props.data.links)
      .enter()
      .append("line")
      .style("stroke", "#999999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", (d) => Math.sqrt(d.value));

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const nodes = this.graph
      .append("g")
      .attr("class", "nodes")
      .selectAll(".nodes")
      .data(this.props.data.nodes)
      .enter()
      .append<SVGCircleElement>("circle")
      .attr("class", "node")
      .attr("r", 5)
      .style("stroke", "#FFFFFF")
      .style("stroke-width", 1.5)
      .style("fill", (d: any) => color(d.group));

    // click event


    d3.selectAll('.nodes')
        .on('click', function(d) {
          console.log(d);
          alert("We recommend artists: "); //**+ d.nodes**//); // artists in proximity

          //

          //// insert recommender system

          // var thisNode = d.id
          //
          //     d3.selectAll(".circleNode").attr("r", 6);
          //     d3.select(this).attr("r", 12);
          //
          //     link.attr("opacity", function(d) {
          //         return (d.source.id == thisNode || d.target.id == thisNode) ? 1 : 0.1
          //     });

        });


    force.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      labels.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
      nodes.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    });
  }

  render() {
    return (
      <div>
      <div
        className="graph-container"
        ref={(ref: HTMLDivElement) => (this.ref = ref)}
      ></div>
      <div className="graph-metrics">
        <span>Zoom Level: { Math.round(this.state.zoomLevel) }</span>
      </div>
      </div>
    );
  }
}