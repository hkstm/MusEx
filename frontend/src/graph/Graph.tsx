import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import { clip } from "../utils";
import "./Graph.sass";
import { faMusic } from "@fortawesome/free-solid-svg-icons";
import Minimap, { MinimapData } from "../charts/minimap/Minimap";
import { Size, Position } from "../common";

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
  zoomLevels: number;
  width: number;
  height: number;
  highlighted: string[];
  dimensions: GraphDataDimensions;
  data: MusicGraph;
  interests: MinimapData;
  recommendations: any;
  minimapWidth?: number;
  minimapHeight?: number;
  useForce?: boolean;
  onZoom?: (zoom: number) => void;
  //sendRecommendations?:any;//  TBA. get the recommendations from app.tsx
  onClick: any;
}

interface GraphState {
  dimx?: string;
  dimy?: string;
  zoomK: number;
  selected: Set<string>;
  minimapPos: Position;
  minimapSelectionSize: Size;
  recs?:[];
 
}

export default class Graph extends React.Component<GraphProps, GraphState> {
  svg!: d3.Selection<SVGSVGElement, MusicGraph, HTMLElement, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, HTMLElement, any>;
  labels!: d3.Selection<SVGGElement, MusicGraphNode, HTMLElement, any>;
  zoom!: d3.ZoomBehavior<SVGSVGElement, MusicGraph>;
  audio: HTMLAudioElement = new Audio("");
  transform!: d3.ZoomTransform;

  maxZoom = 20;
  baseTextSize = 15;
  defaultMinimapSize = 100;
  baseLinkStrokeWidth = 2;
  baseNodeStrokeWidth = 1.5;
  scalePadding = 30;
  // threshold for the node labels that should always remain visible
  largeNodeLabel = 50;

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
      recs: [],
    };

  }

  sendList = () => {
    this.props.onClick(this.state.selected);
  }

  getCoordinateX(y: number = 0){
    const offset =  0.99971815107 * this.props.width - 61.9177001127;
    return 46 + (y * offset);
  }

  isRecommended(id: string) {
    return this.props.recommendations?.nodes.indexOf(id) > -1;
  }

  getCoordinateY(y: number = 0){
    const offset =  1.003 * this.props.height - 62.52; // 1.00262467192 * height + 62.5196850394
    // console.log('updated ', d.name, ' ' , d.y, '> ', 30 + ((1-d.y) * offset));
    return 30 + ((1-y) * offset)
  }

  playIconCoordinates(d: any, zoom: number = 1){
    const x: number = this.getCoordinateX(d.x);
    const y: number = this.getCoordinateY(d.y);
    const s: number = d.size;
    var offset = 0.05 * d.size * zoom;
    return (`${x - 2 * offset},${y + 3 * offset} ${x - 2 * offset},${y - 3 * offset} ${x + 3 * offset},${y}`);
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
      // window.innerWidth
      // const w =
      const x =
        (this.props.width - event.transform.x / k) / 2 / this.props.width;
      const y =
        (this.props.height - event.transform.y / k) / 2 / this.props.height;

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
        .attr("points", (d:MusicGraphNode) => this.playIconCoordinates(d, 1/k))
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

    const xdim = this.props.dimensions[this.state.dimx ?? ""];
    const ydim = this.props.dimensions[this.state.dimy ?? ""];

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
      .text(() => this.state.dimx ?? "");

    this.svg
      .select<SVGGElement>(".y.label.description")
      .attr(
        "transform",
        `translate(${15 + this.scalePadding},${
          this.props.height / 2
        }) rotate(-90)`
      )
      .text(() => this.state.dimy ?? "");

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

  updateGraphData = (data: MusicGraph) => {
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
      // .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      // .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge);
      .attr("cx", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      .attr("cy", (d: MusicGraphNode) => (this.getCoordinateY(d.y)));

    nodes
      .select("text")
      // .attr("x", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      // .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge);
      .attr("x", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      .attr("y", (d: MusicGraphNode) => (this.getCoordinateY(d.y)));

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
              s.sendList()
          } else {
           
            clicked
              .select("circle")
              .style("stroke", "#F8FF20")
              .style("stroke-width", 5);
              s.state.selected.add(d.id);
              s.sendList();
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
      // .attr("cx", (d: MusicGraphNode) => (d.x ?? 0) * enlarge)
      // .attr("cy", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .attr("cx", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      .attr("cy", (d: MusicGraphNode) => (this.getCoordinateY(d.y))) // used to be enlarge
      .attr("r", 0)
      .attr("opacity", 0)
      .style("stroke", (d: MusicGraphNode) =>
        // this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF"
        this.isRecommended(d.id) || this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF"
      )
      // .attr("stroke-width", this.baseNodeStrokeWidth / this.state.zoomK)
      .attr("stroke-width", (d: MusicGraphNode) => this.isRecommended(d.id) ? 5 : this.baseNodeStrokeWidth  )
      // .style("stroke-width", 1.5)
      .style("fill", (d: MusicGraphNode) => d.color ?? "white");

    newNodes
      .append("polygon")
      .attr("class", "playIcon")
      .attr("points", (d:MusicGraphNode) => this.playIconCoordinates(d))
      .style("stroke", "black")
      .style("fill", "#242424")
      .style("opacity", "0")

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
      // .attr("y", (d: MusicGraphNode) => (d.y ?? 0) * enlarge)
      .attr("x", (d: MusicGraphNode) => this.getCoordinateX(d.x ?? 0))
      .attr("y", (d: MusicGraphNode) => (this.getCoordinateY(d.y)) + 5)
      .attr("fill", "white")
      .style("stroke", "#DCDCDC")
      .style("stroke-width", 0.4/this.state.zoomK)
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
      .select("polygon")
      .transition("enter")
      .duration(300)
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
    links.exit().transition("exit").duration(300).style("opacity", 0.6).remove();

    // update the position for links that will survive the update
    links
      .select("line")
      // .attr("x1", (d: MusicGraphLink) => (d.x1 ?? 0) * enlarge)
      // .attr("y1", (d: MusicGraphLink) => (d.y1 ?? 0) * enlarge)
      .attr("x1", (d: MusicGraphLink) => this.getCoordinateX(d.x1 ?? 0))
      .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y1))
      // .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      // .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge)
      .attr("x2", (d: MusicGraphLink) => this.getCoordinateX(d.x2 ?? 0))
      .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y2))

    // add links that were not in the graph before
    const newLinks = links
      .enter()
      .append("line")
      .attr("class", (d: MusicGraphLink) => `link ${d.name}-${d.id}`)
      .style("stroke", "#FFFFFF")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", "0px")
      // .attr("x1", (d: MusicGraphLink) => (d.x1 ?? 0) * enlarge)
      // .attr("y1", (d: MusicGraphLink) => (d.y1 ?? 0) * enlarge)
      .attr("x1", (d: MusicGraphLink) => this.getCoordinateX(d.x1 ?? 0))
      .attr("y1", (d: MusicGraphLink) => this.getCoordinateY(d.y1))
      // .attr("x2", (d: MusicGraphLink) => (d.x2 ?? 0) * enlarge)
      // .attr("y2", (d: MusicGraphLink) => (d.y2 ?? 0) * enlarge)
      .attr("x2", (d: MusicGraphLink) => this.getCoordinateX(d.x2 ?? 0))
      .attr("y2", (d: MusicGraphLink) => this.getCoordinateY(d.y2))

    // animate entering of new links
    newLinks
      .transition("enter")
      .duration(300)
      .style("stroke-opacity", 0.6)
      .style(
        "stroke-width",
        Math.max(0.4, this.baseLinkStrokeWidth / this.state.zoomK) + "px"
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
    if (
      prevProps.width !== this.props.width ||
      prevProps.height !== this.props.height ||
      prevProps.data !== this.props.data
    ) {
      this.updateGraph();
      this.updateAxis(this.transform);
    }
    if (prevProps.highlighted !== this.props.highlighted) {
      this.highlightNodes();
    }
    if (prevProps.recommendations !== this.props.recommendations) {
      this.highlightRecos();
    }
  }

  highlightNodes() {
    const s = this;
    const nodes = this.graph
      .selectAll(".nodes")
      .selectAll<SVGGElement, MusicGraphNode>(".node");
    nodes.each(function (d: MusicGraphNode) {
      const node = d3.select(this);
      if (s.props.highlighted.includes(node.attr("id"))) {
        console.log("found", node.attr("id"));
      }
    });
  }
  highlightRecos() {
    const s = this;
    const nodes = this.graph
      .selectAll(".nodes")
      .selectAll<SVGGElement, MusicGraphNode>(".node")
      .select("circle")
      .style("stroke", (d: MusicGraphNode) => this.isRecommended(d.id)? "#800080":this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF")
    .attr("stroke-width", (d: MusicGraphNode) => this.isRecommended(d.id) ? 5 : s.state.selected.has(d.id) ? 5 : this.baseNodeStrokeWidth  )
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

    this.addAxis();
    this.addGraph();
    this.updateGraph();
  }

  handleMinimapUpdate = (pos: Position, size: Size) => {
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

  // onGetRecommendations(){
  //   this.props.sendRecommendations(this.state.recs);
  // };

  render() {
    return (

      
      <div>
        <div className="minimap-container">
          <Minimap
            enabled={true}
            onUpdate={this.handleMinimapUpdate}
            data={this.props.interests}
            pos={this.state.minimapPos}
            size={this.state.minimapSelectionSize}
            width={100}
            height={100}
          ></Minimap>
        </div>
        <div id="graph-container"></div>
        <div className="graph-metrics">
          {/*<span>Zoom Level: {Math.round(this.state.zoomLevel)}</span>*/}
        </div>
      </div>
    );
  }
}
