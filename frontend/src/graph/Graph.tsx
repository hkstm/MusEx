import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import { clip, capitalize } from "../utils";
import "./Graph.sass";
import Minimap, { MinimapData } from "../charts/minimap/Minimap";
import { Size, Position, NodeType, apiVersion, headerConfig } from "../common";
import axios from "axios";
import { HeatmapTile } from "../charts/heatmap/Heatmap";

const buildData = (w: number, h: number) => {
  let data: HeatmapTile[] = [];
  Array(w)
    .fill(0)
    .forEach((_, wi) => {
      Array(h)
        .fill(0)
        .forEach((_, hi) => {
          data.push({
            x: wi,
            y: hi,
            value: 0,
          });
        });
    });
  return data;
};

export type GraphDataDimensions = {
  [key: string]: {
    description: string;
    lower: string;
    higher: string;
    min: number;
    max: number;
  };
};

interface GraphProps {
  enabled: boolean;
  width: number;
  height: number;
  minimapWidth?: number;
  minimapHeight?: number;
  zoomLevels: number;
  dimx?: string;
  dimy?: string;
  dimensions: GraphDataDimensions;
  onZoom?: (zoom: number) => void;
}

interface GraphState {
  x: number;
  y: number;
  zoom: number;
  zoomLevel: number;
  levelType: NodeType;
  zoomK: number;
  selected: Set<string>;
  minimapPos: Position;
  minimapSelectionSize: Size;
  data: MusicGraph;
  interests: MinimapData;
  highlighted: string[];
}

export default class Graph extends React.Component<GraphProps, GraphState> {
  svg!: d3.Selection<SVGSVGElement, MusicGraph, HTMLElement, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, HTMLElement, any>;
  labels!: d3.Selection<SVGGElement, MusicGraphNode, HTMLElement, any>;
  zoom!: d3.ZoomBehavior<SVGSVGElement, MusicGraph>;
  audio: HTMLAudioElement = new Audio("");
  transform!: d3.ZoomTransform;

  levels: NodeType[] = ["genre", "artist", "track"];
  lastUpdateZoomLevel?: number = undefined;
  lastUpdate?: { zoom: number; levelType: NodeType } = undefined;

  maxZoom = 20;
  baseTextSize = 15;
  defaultMinimapSize = 100;
  baseLinkStrokeWidth = 2;
  baseNodeStrokeWidth = 1.5;
  scalePadding = 30;
  // threshold for the node labels that should always remain visible
  largeNodeLabel = 45;
  gradients = {
    // #3f51b5
    // #009688
    genre: ["blue", "red"],
    artist: ["orange", "red"],
    track: ["yellow", "green"],
  };

  constructor(props: GraphProps) {
    super(props);
    const minimapSelectionSize = {
      width: this.props.minimapWidth ?? this.defaultMinimapSize,
      height: this.props.minimapHeight ?? this.defaultMinimapSize,
    };
    const minimapPos = {
      x: (this.props.minimapWidth ?? this.defaultMinimapSize) / 2,
      y: (this.props.minimapHeight ?? this.defaultMinimapSize) / 2,
    };
    this.state = {
      minimapPos: minimapPos,
      minimapSelectionSize: minimapSelectionSize,
      zoomK: 1,
      selected: new Set<string>(),
      x: 0.5,
      y: 0.5,
      zoom: 0,
      zoomLevel: 0,
      levelType: "genre",
      data: {
        nodes: [],
        links: [],
      },
      highlighted: [],
      interests: {
        tiles: buildData(20, 20),
        xSize: 20,
        ySize: 20,
      },
    };
  }

  playIconCoordinates(d: MusicGraphNode, zoom: number, enlarge: number) {
    const x = (d.x ?? 0) * enlarge;
    const y = (d.y ?? 0) * enlarge;
    // const x: number = this.getCoordinateX(d.x);
    // const y: number = this.getCoordinateY(d.y);
    const offset = (0.35 * (d.size ?? 0)) / 3 / 2 / zoom;
    return `${x - 2 * offset},${y + 3 * offset} ${x - 2 * offset},${
      y - 3 * offset
    } ${x + 3 * offset},${y}`;
  }

  addAxis = () => {
    // add the axis
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

    // add the axis description labels
    this.svg.append("text").attr("class", "x label description");
    this.svg.append("text").attr("class", "y label description");

    // add the axis description labels
    this.svg.append("text").attr("class", "x label higher");
    this.svg.append("text").attr("class", "x label lower");
    this.svg.append("text").attr("class", "y label higher");
    this.svg.append("text").attr("class", "y label lower");
  };

  addGraph = () => {
    if (!this.props.enabled) return;

    this.graph.append("g").attr("class", "links");
    this.graph.append("g").attr("class", "nodes");

    this.zoom = d3.zoom<SVGSVGElement, MusicGraph>().on("zoom", (event) => {
      this.graph.attr("transform", event.transform);
      this.transform = event.transform;
      const k = event.transform.k;
      // console.log(event.transform.x/k, event.transform.y/k);
      const x =
        (this.props.width - event.transform.x / k) / 2 / this.props.width;
      const y =
        (this.props.height - event.transform.y / k) / 2 / this.props.height;

      const enlarge = Math.min(window.screen.width, window.screen.height);
      const zoomLevel =
        (this.props.zoomLevels * clip(k, 0, this.maxZoom)) / this.maxZoom;

      const nodes = this.graph
        .selectAll(".nodes")
        .selectAll<SVGGElement, MusicGraphNode>(".node");
      nodes
        .select("circle")
        .attr("r", (d: MusicGraphNode) => ((d.size ?? 0) * 0.35) / k)
        .attr("stroke-width", this.baseNodeStrokeWidth / k);
      nodes
        .select("polygon")
        .attr("points", (d: MusicGraphNode) =>
          this.playIconCoordinates(d, k, enlarge)
        );
      nodes.select("text").style("font-size", this.baseTextSize / k + "px");

      const links = this.graph
        .selectAll(".links")
        .selectAll<SVGGElement, MusicGraphNode>(".link");

      links.style(
        "stroke-width",
        Math.max(1, this.baseLinkStrokeWidth / k) + "px"
      );

      const minimapSelectionSize = {
        width:
          (this.props.minimapWidth ?? this.defaultMinimapSize) / Math.max(1, k),
        height:
          (this.props.minimapHeight ?? this.defaultMinimapSize) /
          Math.max(1, k),
      };
      // console.log(x, y);
      if (!this.lastUpdate || this.state.zoomK >= 2 * this.lastUpdate?.zoom) {
        console.log("updating");
        this.loadGraphData();
        this.updateGraph(this.state.data);
      }

      const minimapPos = {
        x: x * (this.props.minimapWidth ?? this.defaultMinimapSize),
        y: y * (this.props.minimapHeight ?? this.defaultMinimapSize),
      };
      this.updateAxis(this.transform);
      this.setState(
        {
          zoomK: k,
          minimapSelectionSize,
          minimapPos,
        },
        () => {
          if (this.props.onZoom) this.props.onZoom(zoomLevel);
        }
      );
    });

    this.svg.call(this.zoom).call(this.zoom.transform, d3.zoomIdentity);
  };

  updateAxis = (transform: d3.ZoomTransform) => {
    if (!transform) return;

    const xdim = this.props.dimensions[this.props.dimx ?? ""];
    const ydim = this.props.dimensions[this.props.dimy ?? ""];

    const xScale = d3
      .scaleLinear()
      .domain([xdim?.min ?? 0, xdim?.max ?? 0])
      .range([this.scalePadding, this.props.width - this.scalePadding]);

    const yScale = d3
      .scaleLinear()
      .domain([ydim?.max ?? 1, ydim?.min ?? 0])
      .range([this.scalePadding, this.props.height - this.scalePadding]);

    const xrange = xScale.range().map(transform.invertX, transform),
      xdomain = xrange.map(xScale.invert, xScale),
      yrange = yScale.range().map(transform.invertY, transform),
      ydomain = yrange.map(yScale.invert, yScale);

    const xAxis = d3.axisBottom(xScale.copy().domain(xdomain));
    const yAxis = d3.axisLeft(yScale.copy().domain(ydomain));

    this.svg
      .select<SVGGElement>(".x.label.description")
      .attr(
        "transform",
        `translate(${this.props.width / 2}, ${
          this.props.height - this.scalePadding - 10
        })`
      )
      .text(() => this.props.dimx ?? "");

    this.svg
      .select<SVGGElement>(".y.label.description")
      .attr(
        "transform",
        `translate(${15 + this.scalePadding},${
          this.props.height / 2
        }) rotate(-90)`
      )
      .text(() => this.props.dimy ?? "");

    this.svg
      .select<SVGGElement>(".x.label.higher")
      .attr(
        "transform",
        `translate(${this.props.width - 75}, ${
          this.props.height - this.scalePadding - 10
        })`
      )
      .text(() => xdim?.higher ?? "higher");

    this.svg
      .select<SVGGElement>(".x.label.lower")
      .attr(
        "transform",
        `translate(${85}, ${this.props.height - this.scalePadding - 10})`
      )
      .text(xdim?.lower ?? "lower");

    this.svg
      .select<SVGGElement>(".y.label.higher")
      .attr(
        "transform",
        `translate(${15 + this.scalePadding},${75}) rotate(-90)`
      )
      .text(ydim?.higher ?? "higher");

    this.svg
      .select<SVGGElement>(".y.label.lower")
      .attr(
        "transform",
        `translate(${15 + this.scalePadding},${
          this.props.height - this.scalePadding - 60
        }) rotate(-90)`
      )
      .text(ydim?.lower ?? "lower");

    // update the x and y axis
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

  loadGraphData = () => {
    console.log(
      "updating graph for ",
      this.props.dimx,
      this.props.dimy,
      this.state.x,
      this.state.y,
      this.state.zoom,
      this.state.zoomLevel,
      this.state.levelType
    );
    this.lastUpdate = {
      zoom: this.state.zoomK,
      levelType: this.state.levelType,
    };
    const graphDataURL = `http://localhost:5000/${apiVersion}/graph?x=${this.state.x}&y=${this.state.y}&zoom=${this.state.zoom}&dimx=${this.props.dimx}&dimy=${this.props.dimy}&type=${this.state.levelType}&limit=1000`;
    axios.get(graphDataURL, headerConfig).then((res) => {
      // console.log(res.data.nodes.length + " nodes");
      // console.log(res.data.links.length + " links");
      this.setState({ data: res.data });
    });
  };

  updateGraph = (data: MusicGraph) => {
    const enlarge = Math.min(window.screen.width, window.screen.height);

    this.svg.attr("width", this.props.width).attr("height", this.props.height);
    this.graph
      .attr("width", this.props.width)
      .attr("height", this.props.height);

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
    // .attr("cx", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
    // .attr("cy", (d: MusicGraphNode) => (this.getCoordinateY(d.y)));

    nodes
      .select("text")
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge);
    // .attr("x", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
    // .attr("y", (d: MusicGraphNode) => (this.getCoordinateY(d.y)));

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
    newNodes
      .append("circle")
      .attr("id", (d: MusicGraphNode) => d.name)
      .attr("class", (d: MusicGraphNode) => `${d.id}`)
      .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      // .attr("cx", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      // .attr("cy", (d: MusicGraphNode) => (this.getCoordinateY(d.y))) // used to be enlarge
      .attr("r", 0)
      .attr("opacity", 0)
      .style("stroke", (d: MusicGraphNode) =>
        this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF"
      )
      .attr("stroke-width", this.baseNodeStrokeWidth / this.state.zoomK)
      .style("fill", (d: MusicGraphNode) => d.color ?? "white");

    // add the play icon
    newNodes
      .append("polygon")
      .attr("class", "playIcon")
      // .attr("points", (d:MusicGraphNode) => this.playIconCoordinates(d))
      .attr("points", (d: MusicGraphNode) =>
        this.playIconCoordinates(d, this.state.zoomK, enlarge)
      )
      .style("stroke", "black")
      .style("fill", "#242424")
      .style("opacity", "0");

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
      // .text((d) => d.name + " " +  d.x.toFixed(3) + "," + d.y.toFixed(3)) // For debugging coordinates
      // .attr(
      //   "x",
      //   (d: MusicGraphNode) =>
      //     (d.x ?? 0) * enlarge // + (d.size ?? 0) * 0.35 + 5
      // )
      .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      // .attr("x", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      // .attr("y", (d: MusicGraphNode) => (this.getCoordinateY(d.y)) + 5)
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
      .style("opacity", 0.8);

    newNodes
      .select("polygon")
      .transition("enter")
      .duration(300)
      .style("opacity", 0.8);

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
      // .attr("x1", (d: MusicGraphLink) => this.getCoordinateX(d.x1 ?? 0))
      // .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y1))
      .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge);
    // .attr("x2", (d: MusicGraphLink) => this.getCoordinateX(d.x2 ?? 0))
    // .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y2))

    // add links that were not in the graph before
    const newLinks = links
      .enter()
      .append("line")
      .attr("class", (d: MusicGraphLink) => `link ${d.name}-${d.id}`)
      .style("stroke", "#FFFFFF")
      .style("stroke-opacity", 0)
      .style("stroke-width", "0px")
      .attr("x1", (d: MusicGraphLink) => (d.x1 ?? 0) * enlarge)
      .attr("y1", (d: MusicGraphLink) => (d.y1 ?? 0) * enlarge)
      // .attr("x1", (d: MusicGraphLink) => this.getCoordinateX(d.x1 ?? 0))
      // .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y1))
      .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge);
    // .attr("x2", (d: MusicGraphLink) => this.getCoordinateX(d.x2 ?? 0))
    // .attr("y2", (d: MusicGraphLink) => this.getCoordinateY(d.y2))

    // animate entering of new links
    newLinks
      .transition("enter")
      .duration(300)
      .style("stroke-opacity", 1)
      .style(
        "stroke-width",
        Math.max(0.4, this.baseLinkStrokeWidth / this.state.zoomK) + "px"
      );

    const backgroundGradient = this.svg.select("defs").select("#mainGradient");
    const gradient = this.gradients[this.state.levelType];
    backgroundGradient.select(".stop-left").attr("stop-color", gradient[0]);
    backgroundGradient.select(".stop-right").attr("stop-color", gradient[1]);
  };

  componentDidUpdate(prevProps: GraphProps, prevState: any) {
    // if (
    //   prevProps.width !== this.props.width ||
    //   prevProps.height !== this.props.height ||
    //   prevProps.dimx !== this.props.dimx ||
    //   prevProps.dimx !== this.props.dimx ||
    //   prevProps.dimensions !== this.props.dimensions ||
    //   prevProps.zoomLevels !== this.props.zoomLevels ||
    //   prevProps.enabled !== this.props.enabled
    // ) {
    if (!this.props.enabled) return;
    if (
      this.props.dimx !== this.state.data.dimx ||
      this.props.dimy !== this.state.data.dimy
    ) {
      this.updateGraph({ links: [], nodes: [] } as MusicGraph);
    }
    if ( 
      prevProps.dimx !== this.props.dimx || 
      prevProps.dimy !== this.props.dimy || 
      prevState.x !== this.state.x || 
      prevState.y !== this.state.y || 
      prevState.y !== this.state.y || 
      prevState.zoom !== this.state.zoom || 
      prevState.zoomLevel !== this.state.zoomLevel || 
      prevState.levelType !== this.state.levelType 
    ) {
        this.loadGraphData();
    }
    if (
      prevState.data !== this.state.data || 
      prevProps.width !== this.props.width || 
      prevProps.height !== this.props.height
    ) {
      this.updateGraph(this.state.data);
      this.updateAxis(this.transform);
    }
    // }
  }

  highlightNodes() {
    const s = this;
    const nodes = this.graph
      .selectAll(".nodes")
      .selectAll<SVGGElement, MusicGraphNode>(".node");
    nodes.each(function (d: MusicGraphNode) {
      const node = d3.select(this);
      if (s.state.highlighted.includes(node.attr("id"))) {
        console.log("found", node.attr("id"));
      }
    });
  }

  componentDidMount() {
    this.svg = d3
      .select<SVGSVGElement, MusicGraph>("#graph-container")
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    const svgDefs = this.svg.append("defs");
    const backgroundGradient = svgDefs
      .append("linearGradient")
      .attr("id", "mainGradient")
      .attr("gradientTransform", "rotate(45)");

    backgroundGradient
      .append("stop")
      .attr("class", "stop-left")
      .attr("offset", "0");

    backgroundGradient
      .append("stop")
      .attr("class", "stop-right")
      .attr("offset", "1");

    this.graph = this.svg
      .append("g")
      .attr("class", "graph")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    this.graph
      .append("rect")
      .classed("filled", true)
      .attr("x", -this.props.width)
      .attr("y", -this.props.height)
      .attr("width", 3 * this.props.width)
      .attr("height", 3 * this.props.height);

    console.log("loading");
    this.addAxis();
    this.addGraph();
    this.loadGraphData();
    this.updateGraph(this.state.data);
  }

  handleMinimapUpdate = (pos: Position, size: Size) => {
    // // this code can be used for zooming to the seletion
    // console.log(pos, size);
    // this.setState(
    //   {
    //     minimapPos: pos,
    //     minimapSelectionSize: size,
    //   },
    //   () => {
    //     this.svg.call(
    //       // .transition().duration(750).call(
    //       this.zoom.transform,
    //       // d3.zoomIdentity.translate(pos.x, pos.y).scale(size.width)
    //       d3.zoomIdentity
    //       // d3.mouse(svg.node())
    //     );
    //   }
    // );
  };

  render() {
    return (
      <div>
        <div className="minimap-container">
          <Minimap
            enabled={true}
            data={this.state.interests}
            pos={this.state.minimapPos}
            size={this.state.minimapSelectionSize}
            width={this.props.minimapWidth}
            height={this.props.minimapHeight}
          ></Minimap>
        </div>
        <div id="graph-container"></div>
        <div className="graph-metrics">
          <span className="level-type-label">
            {capitalize(this.state.levelType)}
          </span>
        </div>
      </div>
    );
  }
}
