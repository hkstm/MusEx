import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import "./Graph.sass";

interface GraphProps {
  enabled: boolean;
  width: number;
  height: number;
  data: MusicGraph;
  useForce?: boolean;
}

interface GraphState {
  zoomLevel: number;
}

// type SimNode = MusicGraphNode;
// type SimLink = d3.SimulationLinkDatum<MusicGraphNode>;

export default class Graph extends React.Component<GraphProps, GraphState> {
  ref!: HTMLDivElement;
  svg!: d3.Selection<SVGSVGElement, MusicGraph, null, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, null, any>;
  force: any;

  constructor(props: GraphProps) {
    super(props);
    this.state = {
      zoomLevel: 1,
    };
  }

  updateGraph = () => {
    if (!this.props.enabled) return;
    if (!this.props.data) return;
    console.log("updating the graph");
    console.log(this.props.data);

    // Create scale
    const padding = 30;
    const x_scale = d3
      .scaleLinear()
      .domain([0, 1.0])
      .range([padding, this.props.width - padding]);
    const y_scale = d3
      .scaleLinear()
      .domain([1.0, 0.0])
      .range([padding, this.props.height - padding]);

    // Add scales to axis
    const x_axis = d3.axisBottom(x_scale);
    const y_axis = d3.axisLeft(y_scale);

    this.svg
      .append("g")
      .attr("transform", `translate(0,${this.props.height - padding})`)
      .call(x_axis);

    this.svg
      .append("g")
      .attr("transform", `translate(${padding},0)`)
      .call(y_axis);

    const zoom = d3.zoom<SVGSVGElement, MusicGraph>().on("zoom", (event) => {
      this.graph.attr("transform", event.transform);
      // console.log(event);
      this.setState({ zoomLevel: event.transform.k });
    });

    this.svg.call(zoom);

    if (this.props.useForce ?? false) {
      // const forceLink = d3
      //   .forceLink<SimNode, SimLink>(this.props.data.links)
      //   .id((d: MusicGraphNode) => {
      //     return d.name;
      //   })
      //   .distance(50)
      //   .links(this.props.data.links);
      // const force = d3
      //   .forceSimulation<SimNode, SimLink>(this.props.data.nodes)
      //   .nodes(this.props.data.nodes)
      //   .force("link", forceLink)
      //   .force("charge", d3.forceManyBody().strength(-120))
      //   .force(
      //     "center",
      //     d3.forceCenter(this.props.width / 2, this.props.height / 2)
      //   );
    }

    const enlarge = 4000;
    const labels = this.graph
      .append("g")
      .attr("class", "labels")
      .selectAll(".labels")
      // .data(this.props.data.nodes, (d: MusicGraphNode) => d.name)
      .data(this.props.data.nodes)
      .enter()
      .append<SVGTextElement>("text")
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .attr("class", "label")
      .attr("fill", "white")
      .text((d) => d.name);

    const links = this.graph
      .append("g")
      .selectAll("line")
      .data(this.props.data.links)
      .enter()
      .append("line")
      // .attr("x", (d: MusicGraphLink) => (d.x ?? 0) * enlarge)
      // .attr("y", (d: MusicGraphLink) => (d.y ?? 0) * enlarge)
      .style("stroke", "#999999")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", "2px");

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
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .style("stroke", "#FFFFFF")
      .style("stroke-width", 1.5)
      .style("fill", (d: MusicGraphNode) =>
        d.genres && d.genres.length > 0 ? color(d.genres.join("/")) : "white"
      );

    if (this.props.useForce ?? false) {
      this.force.on("tick", () => {
        links
          .attr(
            "x1",
            (d: MusicGraphLink) => (d.source.x ?? 0) * this.props.width
          )
          .attr(
            "y1",
            (d: MusicGraphLink) => (d.source.y ?? 0) * this.props.height
          )
          .attr(
            "x2",
            (d: MusicGraphLink) => (d.target.x ?? 0) * this.props.width
          )
          .attr(
            "y2",
            (d: MusicGraphLink) => (d.target.y ?? 0) * this.props.height
          );
        labels
          .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
          .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
        nodes
          .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
          .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
      });
    }
  };

  componentDidUpdate(prevProps: GraphProps) {
    if (prevProps.data !== this.props.data) {
      this.updateGraph();
    }
  }

  componentDidMount() {
    this.svg = d3
      .select<HTMLDivElement, MusicGraph>(this.ref)
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.graph = this.svg
      .append("g")
      .attr("class", "graph")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.updateGraph();
  }

  render() {
    return (
      <div>
        <div
          className="graph-container"
          ref={(ref: HTMLDivElement) => (this.ref = ref)}
        ></div>
        <div className="graph-metrics">
          {/*<span>Zoom Level: {Math.round(this.state.zoomLevel)}</span>*/}
        </div>
      </div>
    );
  }
}
