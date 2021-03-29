import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import { clip } from "../utils";
import "./Graph.sass";

interface GraphProps {
  enabled: boolean;
  zoomLevels: number;
  width: number;
  height: number;
  data: MusicGraph;
  useForce?: boolean;
  onZoom?: (zoom: number) => void;
}

interface GraphState {
  dimx?: string;
  dimy?: string;
  zoomLevel: number;
}

// type SimNode = MusicGraphNode;
// type SimLink = d3.SimulationLinkDatum<MusicGraphNode>;

export default class Graph extends React.Component<GraphProps, GraphState> {
  ref!: HTMLDivElement;
  svg!: d3.Selection<SVGSVGElement, MusicGraph, null, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, null, any>;
  labels!: d3.Selection<SVGGElement, MusicGraphNode, null, any>;
  force: any;
  baseTextSize = 10;
  baseLinkWidth = 3;
  baseNodeRadius = 5;
  scalePadding = 30;

  constructor(props: GraphProps) {
    super(props);
    this.state = {
      dimx: undefined,
      dimy: undefined,
      zoomLevel: 0,
    };
  }

  addAxis = () => {
    this.svg
      .append("g")
      .attr("class", "x axis")
      .attr(
        "transform",
        `translate(0,${this.props.height - this.scalePadding})`
      );
    this.svg
      .append("g")
      .attr("class", "y axis")
      .attr("transform", `translate(${this.scalePadding},0)`);
  };

  addGraph = () => {
    if (!this.props.enabled) return;

    const zoom = d3.zoom<SVGSVGElement, MusicGraph>();
    this.graph.append("g").attr("class", "links");
    this.graph.append("g").attr("class", "nodes");

    zoom.on("zoom", (event) => {
      this.graph.attr("transform", event.transform);
      const k = event.transform.k;
      // console.log(event.transform.x/k, event.transform.y/k);
      const x =
        (window.innerWidth - event.transform.x / k) / 2 / window.innerWidth;
      const y =
        (window.innerHeight - event.transform.y / k) / 2 / window.innerHeight;

      const maxZoom = 20;
      const zoomLevel = (this.props.zoomLevels * clip(k, 0, maxZoom)) / maxZoom;
      const textSize = this.baseTextSize / k;
      const linkWidth = this.baseLinkWidth / k;

      const nodes = this.graph
        .selectAll(".nodes")
        .selectAll<SVGGElement, MusicGraphNode>(".node");
      nodes.select("circle").attr("r", this.baseNodeRadius / k);
      nodes.select("text").style("font-size", textSize + "px");
      const links = this.graph
        .selectAll(".links")
        .selectAll<SVGGElement, MusicGraphNode>(".link");
      links.style("stroke-width", linkWidth);

      // TODO: Use the actual zoom values here
      this.updateAxis(0, k, 0, 2 * k);
      this.setState({ zoomLevel });
      if (this.props.onZoom) this.props.onZoom(zoomLevel);
    });

    this.svg.call(zoom);
  };

  updateAxis = (xmin: number, xmax: number, ymin: number, ymax: number) => {
    const xScale = d3
      .scaleLinear()
      .domain([xmin, xmax])
      .range([this.scalePadding, this.props.width - this.scalePadding]);
    const yScale = d3
      .scaleLinear()
      .domain([ymax, ymin])
      .range([this.scalePadding, this.props.height - this.scalePadding]);
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    this.svg.select<SVGGElement>(".x.axis").call(xAxis);
    this.svg
      .select<SVGGElement>(".y.axis")
      .attr("transform", `translate(${this.scalePadding},0)`)
      .call(yAxis);
  };

  updateGraphData = (data: MusicGraph) => {
    const enlarge = Math.min(window.screen.width, window.screen.height);

    // update the node data
    const nodes = this.graph
      .selectAll(".nodes")
      .selectAll<SVGGElement, MusicGraphNode>(".node")
      .data(data.nodes, (d) => d.id);

    // remove nodes that are no longer required
    nodes
      .exit()
      .transition("exit")
      .duration(300)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();

    // update the position for nodes that will survive the update
    nodes
      .select("circle")
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge);
    nodes
      .select("text")
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge);

    // add elements that were not in the graph before
    const newNodes = nodes.enter().append("g").attr("class", "node");

    // add the node circles
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    newNodes
      .append("circle")
      .attr("class", (d: MusicGraphNode) => `${d.id}`)
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .attr("r", 0)
      .attr("opacity", 0)
      .style("stroke", "#FFFFFF")
      .style("stroke-width", 1.5)
      .style("fill", (d: MusicGraphNode) =>
        d.genres && d.genres.length > 0 ? color(d.genres.join("/")) : "white"
      );

    // add the text labels for the nodes
    newNodes
      .append<SVGTextElement>("text")
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .attr("class", (d: MusicGraphNode) => `${d.id}`)
      .attr("fill", "white")
      .attr("opacity", 0)
      .style("font-size", this.baseTextSize + "px")
      .text((d) => d.name);

    // animate entering nodes and labels
    newNodes
      .select("circle")
      .transition("enter")
      .duration(300)
      .attr("r", this.baseNodeRadius)
      .attr("opacity", 1);

    newNodes
      .select("text")
      .transition("enter")
      .duration(300)
      .attr("opacity", 1);

    // update the link data
    const links = this.graph
      .selectAll(".links")
      .selectAll<SVGGElement, MusicGraphLink>(".link")
      .data(data.links, (d) => d.id);

    // remove links that are no longer required
    links.exit().transition("exit").duration(300).style("opacity", 0).remove();

    // update the position for links that will survive the update
    links
      .select("line")
      .attr("x1", (d: MusicGraphLink) => (d.x1 ?? 0) * enlarge)
      .attr("y1", (d: MusicGraphLink) => (d.y1 ?? 0) * enlarge)
      .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge);

    // add links that were not in the graph before
    const newLinks = links
      .enter()
      .append("line")
      .attr("class", (d: MusicGraphLink) => `link ${d.id}`)
      .style("stroke", "#FFFFFF")
      .style("stroke-opacity", 0)
      .style("stroke-width", "0px")
      .attr("x1", (d: MusicGraphLink) => (d.x1 ?? 0) * enlarge)
      .attr("y1", (d: MusicGraphLink) => (d.y1 ?? 0) * enlarge)
      .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge);

    // animate entering of new links
    newLinks
      .transition("enter")
      .duration(300)
      .style("stroke-opacity", 1)
      .style("stroke-width", "2px");
  };

  updateGraph = () => {
    if (!this.props.enabled) return;
    if (!this.props.data) return;
    if (this.props.data.nodes.length < 1) return;

    if (
      this.state.dimx !== this.props.data.dimx ||
      this.state.dimy !== this.props.data.dimy
    ) {
      this.updateGraphData({ links: [], nodes: [] } as MusicGraph);
    }
    this.setState({ dimx: this.props.data.dimx });
    this.setState({ dimy: this.props.data.dimy });
    this.updateGraphData(this.props.data);

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
      // this.force.on("tick", () => {
      //   links
      //     .attr(
      //       "x1",
      //       (d: MusicGraphLink) => (d.source.x ?? 0) * this.props.width
      //     )
      //     .attr(
      //       "y1",
      //       (d: MusicGraphLink) => (d.source.y ?? 0) * this.props.height
      //     )
      //     .attr(
      //       "x2",
      //       (d: MusicGraphLink) => (d.target.x ?? 0) * this.props.width
      //     )
      //     .attr(
      //       "y2",
      //       (d: MusicGraphLink) => (d.target.y ?? 0) * this.props.height
      //     );
      //   labels
      //     .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
      //     .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
      //   nodes
      //     .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width)
      //     .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height);
      // });
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

    this.addAxis();
    this.addGraph();
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
