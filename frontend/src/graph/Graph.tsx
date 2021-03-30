import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import { clip } from "../utils";
import "./Graph.sass";
import { faMusic } from "@fortawesome/free-solid-svg-icons";

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
  zoomK: number;
  selected: Set<string>;
}

// type SimNode = MusicGraphNode;
// type SimLink = d3.SimulationLinkDatum<MusicGraphNode>;

export default class Graph extends React.Component<GraphProps, GraphState> {
  svg!: d3.Selection<SVGSVGElement, MusicGraph, HTMLElement, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, HTMLElement, any>;
  labels!: d3.Selection<SVGGElement, MusicGraphNode, HTMLElement, any>;
  audio: HTMLAudioElement = new Audio("");
  force: any;
  maxZoom = 20;
  baseTextSize = 15;
  baseLinkStrokeWidth = 2;
  baseNodeStrokeWidth = 1.5;
  scalePadding = 30;
  largeNodeLabel = 65; // threshold for the node labels that should always remain visible

  constructor(props: GraphProps) {
    super(props);
    this.state = {
      zoomK: 1,
      selected: new Set<string>(),
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

    this.graph.append("g").attr("class", "links");
    this.graph.append("g").attr("class", "nodes");

    const zoom = d3.zoom<SVGSVGElement, MusicGraph>();
    zoom.on("zoom", (event) => {
      this.graph.attr("transform", event.transform);
      const k = event.transform.k;
      // console.log(event.transform.x/k, event.transform.y/k);
      const x =
        (window.innerWidth - event.transform.x / k) / 2 / window.innerWidth;
      const y =
        (window.innerHeight - event.transform.y / k) / 2 / window.innerHeight;

      const zoomLevel =
        (this.props.zoomLevels * clip(k, 0, this.maxZoom)) / this.maxZoom;

      const nodes = this.graph
        .selectAll(".nodes")
        .selectAll<SVGGElement, MusicGraphNode>(".node");
      nodes
        .select("circle")
        .attr("r", (d: MusicGraphNode) => ((d.size ?? 0) * 0.35) / k)
        .attr("stroke-width", this.baseNodeStrokeWidth / k);
      nodes.select("text").style("font-size", this.baseTextSize / k + "px");

      const links = this.graph
        .selectAll(".links")
        .selectAll<SVGGElement, MusicGraphNode>(".link");

      links.style(
        "stroke-width",
        Math.max(1, this.baseLinkStrokeWidth / k) + "px"
      );

      // TODO: Use the actual zoom values here
      // we could use the x and y and zoom level and compute the position in [0,1]
      // however, we then maybe want to display the denormalized values in the axis
      // const xmin = this.state.x - this.state.zoom / 3 / 2;
      // const xmax = this.state.x + this.state.zoom / 3 / 2;
      this.updateAxis(0, k, 0, k);
      this.setState({ zoomK: k }, () => {
        if (this.props.onZoom) this.props.onZoom(zoomLevel);
      });
    });

    this.svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
    // this.svg.call(zoom);
  };

  updateAxis = (xmin?: number, xmax?: number, ymin?: number, ymax?: number) => {
    const xScale = d3
      .scaleLinear()
      // .domain([d3.min(this.props.data.nodes,function(d:any){return d.x}), d3.max(this.props.data.nodes, function(d:any){ return d.x; })])
      .domain([xmin ?? 0, xmax ?? 1])
      .range([this.scalePadding, this.props.width - this.scalePadding]);
    const yScale = d3
      .scaleLinear()
      // .domain([d3.min(this.props.data.nodes,function(d:any){return d.x}), d3.max(this.props.data.nodes, function(d:any){ return d.x; })])
      .domain([ymax ?? 1, ymin ?? 0])
      .range([this.scalePadding, this.props.height - this.scalePadding]);
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);
    this.svg
      .select<SVGGElement>(".x.axis")
      .attr(
        "transform",
        `translate(0,${this.props.height - this.scalePadding})`
      )
      .call(xAxis);
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

    const s = this;
    newNodes
      .on("click", function (event: MouseEvent, d: MusicGraphNode) {
        const clicked = d3.select(this);
        if (d.preview_url && event.shiftKey) {
          const isPlaying = !s.audio?.paused ?? false;
          const isNewAudio = !s.audio || s.audio.currentSrc !== d.preview_url;
          s.audio.pause();
          if (isNewAudio) {
            s.audio.src = d.preview_url;
            s.audio.load();
            s.audio.play();
          } else if (!isPlaying) {
            s.audio.play();
          } else {
            // if we did not want double shift click to stop but only reset
            // s.audio.currentTime = 0;
            // s.audio.play();
          }
        } else {
          // toggle selection of the node
          if (s.state.selected.has(d.id)) {
            clicked
              .select("circle")
              .style("stroke", "#FFFFFF")
              .style("stroke-width", 1.5);
            s.state.selected.delete(d.id);
          } else {
            clicked
              .select("circle")
              .style("stroke", "#F8FF20")
              .style("stroke-width", 5);
            s.state.selected.add(d.id);
          }
        }
      })
      .on("mouseover", function (event: MouseEvent, d: MusicGraphNode) {
        d3.select(this).select(".label").style("visibility", "visible");
      })
      .on("mouseout", function (event: MouseEvent, d: MusicGraphNode) {
        d3.select(this).select(".label").style("visibility", "hidden");
      });

    // add the node circles
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    newNodes
      .append("circle")
      .attr("id", (d: MusicGraphNode) => d.name)
      .attr("class", (d: MusicGraphNode) => `${d.id}`)
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * this.props.width) // used to be enlarge
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height) // used to be enlarge
      .attr("r", 0)
      .attr("opacity", 0)
      .style("stroke", (d: MusicGraphNode) =>
        this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF"
      )
      .attr("stroke-width", this.baseNodeStrokeWidth / this.state.zoomK)
      // .style("stroke-width", 1.5)
      .style("fill", (d: MusicGraphNode) =>
        d.genre && d.genre.length > 0 ? color(d.genre.join("/")) : "white"
      );

    // add the text labels for the nodes
    newNodes
      .append<SVGTextElement>("text")
      .attr(
        "class",
        (d: MusicGraphNode) =>
          `${d.id} ${
            d.size! > this.largeNodeLabel ? "labelAlwaysVisible" : "label"
          }`
      )
      .attr("opacity", 0)
      .style("font-size", this.baseTextSize / this.state.zoomK + "px")
      .text((d) => d.name)
      .attr(
        "x",
        (d: MusicGraphNode) =>
          (d.x ?? 0) * this.props.width + (d.size ?? 0) * 0.35 + 5
      )
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * this.props.height + 5) // ** Updated x,y values for the labels **
      .attr("fill", "white")
      // .style("stroke", "black")
      // .style("stroke-width", 0.4)
      .style("visibility", (d: MusicGraphNode) =>
        d.size! > this.largeNodeLabel ? "visible" : "hidden"
      );

    // animate entering nodes and labels
    newNodes
      .select("circle")
      .transition("enter")
      .duration(300)
      .attr(
        "r",
        (d: MusicGraphNode) => ((d.size ?? 0) * 0.35) / this.state.zoomK
      )
      .style("opacity", 0.8); // transparency for better visualization

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
      .style(
        "stroke-width",
        Math.max(1, this.baseLinkStrokeWidth / this.state.zoomK) + "px"
      );
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
  };

  componentDidUpdate(prevProps: GraphProps) {
    if (prevProps.data !== this.props.data) {
      // d3.selectAll(".xaxis").remove()
      // d3.selectAll(".yaxis").remove()
      // d3.selectAll(".nodes").remove()
      // d3.selectAll(".labels").remove()
      this.updateGraph();
    }
  }

  componentDidMount() {
    this.svg = d3
      .select<SVGSVGElement, MusicGraph>("#graph-container")
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.graph = this.svg
      .append("g")
      .attr("class", "graph")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.addAxis();
    this.updateAxis();
    this.addGraph();
    this.updateGraph();
  }

  render() {
    return (
      <div>
        <div id="graph-container"></div>
        <div className="graph-metrics">
          {/*<span>Zoom Level: {Math.round(this.state.zoomLevel)}</span>*/}
        </div>
      </div>
    );
  }
}
