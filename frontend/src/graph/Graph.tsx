import * as React from "react";
import * as d3 from "d3";
import { MusicGraph, MusicGraphNode, MusicGraphLink } from "./model";
import { clip, capitalize } from "../utils";
import "./Graph.sass";
import Minimap, { MinimapData } from "../charts/minimap/Minimap";
import {
  Size,
  Position,
  NodeType,
  Recommendation,
  apiVersion,
  headerConfig,
} from "../common";
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
  onClick?: (node: MusicGraphNode) => void;
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
  recommendations: Recommendation;
  interests: MinimapData;
  highlighted: string[];
  recs?: [];
}

export default class Graph extends React.Component<GraphProps, GraphState> {
  svg!: d3.Selection<SVGSVGElement, MusicGraph, HTMLElement, any>;
  graph!: d3.Selection<SVGGElement, MusicGraph, HTMLElement, any>;
  labels!: d3.Selection<SVGGElement, MusicGraphNode, HTMLElement, any>;
  zoom!: d3.ZoomBehavior<SVGSVGElement, MusicGraph>;
  audio: HTMLAudioElement = new Audio("");
  transform!: d3.ZoomTransform;

  levels: NodeType[] = ["genre", "artist", "track"];
  lastUpdate?: {
    zoomK: number;
    levelType: NodeType;
    position: Position;
  } = undefined;

  transitionDuration = 0;
  maxZoom = 15;
  baseTextSize = 15;
  defaultMinimapSize = 100;
  baseLinkStrokeWidth = 2;
  baseNodeStrokeWidth = 1.5;
  minNodeSize = 0.001;
  scalePadding = 30;
  largeNodeLabel = 40;
  lastPlayed: any;
  lastPlayLoop: any;
  gradients = {
    genre: ["#696969", "#A1CFCE"],
    artist: ["#696969", "#8D2639"],
    track: ["#696969", "#008080"],
    // genre: ["blue", "red"],
    // artist: ["orange", "red"],
    // track: ["yellow", "green"],
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
      recommendations: { id: "test" },
      interests: {
        tiles: buildData(20, 20),
        xSize: 20,
        ySize: 20,
      },
      recs: [],
    };
  }

  isRecommended = (id: string) => {
    return this.state.recommendations?.nodes?.includes(id) ?? false;
  };

  getRecommendations = (childData: Set<string>) => {
    this.setState({ selected: new Set(childData) });
    if (this.state.selected.size >= 1) {
      axios
        .get(
          `http://localhost:5000/${apiVersion}/select?node=${
            Array.from(this.state.selected)[0]
          }&zoom=${this.state.zoom}&dimx=${this.props.dimx}&dimy=${
            this.props.dimy
          }&type=${this.state.levelType}&limit=10`,
          headerConfig
        )
        .then((res) => {
          console.log(res.data);
          this.setState({ recommendations: res.data });
          console.log(this.state.recommendations);
        });
    } else {
      this.setState({ recommendations: { id: "" } });
      console.log("We are not getting any recos rn");
    }
  };

  sendList = () => {
    this.getRecommendations(this.state.selected);
  };

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
      // console.log(event.transform.x / k, event.transform.y / k);
      const x =
        (this.props.width - event.transform.x / k) /
        2.8 /
        // this.scalePadding * k) /
        this.props.width;
      const y =
        (this.props.height - event.transform.y / k) /
        2.5 /
        // this.scalePadding * k) /
        this.props.height;

      const enlarge = Math.min(window.screen.width, window.screen.height);
      const zoomLevel =
        (this.props.zoomLevels * clip(k, 0, this.maxZoom)) / this.maxZoom;

      const nodes = this.graph
        .selectAll(".nodes")
        .selectAll<SVGGElement, MusicGraphNode>(".node");
      nodes

        .select("circle")
        .attr("r", this.radius)
        .attr("stroke-width", this.baseNodeStrokeWidth / k);
      nodes.select("polygon").attr("points", this.playIconCoordinates);
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
      // console.log(this.state.zoomK, this.zoom);
      const minimapPos = {
        x: x * (this.props.minimapWidth ?? this.defaultMinimapSize),
        y: y * (this.props.minimapHeight ?? this.defaultMinimapSize),
      };
      this.updateAxis(this.transform);

      const kk = (k / this.maxZoom) * this.levels.length;
      // console.log(x, y, kk);
      this.setState(
        {
          x,
          y,
          zoomK: k,
          zoom: kk - Math.floor(kk),
          levelType: this.levels[Number(Math.floor(kk))],
          minimapSelectionSize,
          minimapPos,
        },
        () => {
          if (
            !this.lastUpdate ||
            this.state.levelType !== this.lastUpdate?.levelType ||
            Math.abs(this.state.zoomK - this.lastUpdate?.zoomK) >=
              1 / (2 * this.props.zoomLevels) ||
            Math.abs(this.state.x - this.lastUpdate?.position.x) >=
              k / this.maxZoom ||
            Math.abs(this.state.y - this.lastUpdate?.position.y) >=
              k / this.maxZoom
          ) {
            this.loadGraphData();
            this.updateGraph(this.state.data);
          }

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
      this.state.x,
      this.state.y,
      this.state.zoom,
      this.state.zoomLevel,
      this.state.levelType,
      this.props.dimx,
      this.props.dimy
    );
    this.lastUpdate = {
      zoomK: this.state.zoomK,
      levelType: this.state.levelType,
      position: { x: this.state.x, y: this.state.y },
    };
    const graphDataURL = `http://localhost:5000/${apiVersion}/graph?x=${this.state.x.toFixed(
      2
    )}&y=${this.state.y.toFixed(2)}&zoom=${this.state.zoom.toFixed(2)}&dimx=${
      this.props.dimx
    }&dimy=${this.props.dimy}&type=${this.state.levelType}&limit=1000`;
    // console.log(graphDataURL);
    axios.get(graphDataURL, headerConfig).then((res) => {
      // console.log(res.data.nodes.length + " nodes");
      // console.log(res.data.links.length + " links");
      this.setState({ data: res.data }, () => {
        this.updateGraph(res.data);
      });
    });
  };

  radius = (node: MusicGraphNode): number => {
    return Math.max(
      this.minNodeSize,
      ((node.size ?? 0) * 0.5) / this.state.zoomK
    );
  };

  coordinate = (coord: number): number => {
    const enlarge = Math.min(window.screen.width, window.screen.height);
    return (coord ?? 0) * enlarge;
  };

  coordinateX = (node: MusicGraphNode) => this.coordinate(node.x);
  coordinateY = (node: MusicGraphNode) => this.coordinate(node.y);

  playIconCoordinates = (node: MusicGraphNode) => {
    const enlarge = Math.min(window.screen.width, window.screen.height);
    const x = this.coordinate(node.x);
    const y = this.coordinate(node.y);
    const offset = (0.3 * (node.size ?? 0)) / (3 * 2 * this.state.zoomK);
    return `${x - 2 * offset},${y + 3 * offset} ${x - 2 * offset},${
      y - 3 * offset
    } ${x + 3 * offset},${y}`;
  };

  musicPlaying(clicked: any, s: any) {
    var strokeWidth = 2;
    function animate() {
      clicked
        .select("polygon")
        .style("fill", "black")
        .style("stroke-width", strokeWidth)
      strokeWidth = strokeWidth === 2 ? 3.2 : strokeWidth === 3.2 ? 4 : strokeWidth === 4 ? 3 : 2;
    }
    var i = setInterval(animate, 200);
    s.musicStopped(s.lastPlayed, s.lastPlayLoop);
    var x = s && s.lastPlayed && s.lastPlayed.__groups && s.lastPlayed.__groups[0];
    debugger;
    s.lastPlayed = clicked;
    s.lastPlayLoop = i;
    setTimeout( ()=> {this.musicStopped(clicked, i); clearInterval(i)}, 20000);
  }
  
  musicStopped(lastPlayed: any, lastPlayLoop: any) {
    if (lastPlayed){
      lastPlayed
        .select("polygon")
        .style("fill", "#242424")
        .style("stroke-width", 1)
      clearInterval(lastPlayLoop);
    }
  }

  updateGraph = (data: MusicGraph) => {
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
      .duration(this.transitionDuration)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();

    // update the position for nodes that will survive the update
    nodes
      .select("circle")
      .attr("cx", this.coordinateX)
      .attr("cy", this.coordinateY);

    nodes
      .select("text")
      .attr("x", this.coordinateX)
      .attr("y", this.coordinateY);

    // add elements that were not in the graph before
    const newNodes = nodes.enter().append("g").attr("class", "node");

    const s = this;
    newNodes
      .on("click", function (event: MouseEvent, d: MusicGraphNode) {
        const clicked = d3.select<SVGGElement, MusicGraphNode>(this);
        if (d.preview_url && event.shiftKey) {
          const isPlaying = !s.audio?.paused ?? false;
          const isNewAudio = !s.audio || s.audio.currentSrc !== d.preview_url;
          s.audio.pause();
          if (isNewAudio) {
            s.audio.src = d.preview_url;
            s.audio.load();
            s.audio.play();
            s.musicPlaying(clicked, s);
          } else if (!isPlaying) {
            s.audio.play();
            s.musicPlaying(clicked, s);
          } else {
            // if we did not want double shift click to stop but only reset
            // s.audio.currentTime = 0;
            // s.audio.play();
            s.musicStopped(s.lastPlayed, s.lastPlayLoop);
          }
        } else {
          // toggle selection of the node
          if (s.state.selected.has(d.id)) {
            clicked
              .select("circle")
              .style("stroke", "#FFFFFF")
              .style("stroke-width", 1.5);
            clicked.select(".selected-info-tooltip").remove();

            s.state.selected.delete(d.id);
            s.sendList();
          } else {
            clicked
              .select("circle")
              .style("stroke", "#F8FF20")
              .style("stroke-width", 5);

            const tooltip = clicked
              .append("g")
              .attr("class", "selected-info-tooltip");

            tooltip
              .append("rect")
              .attr("fill", "white")
              .attr("stroke", "black")
              .attr(
                "x",
                (d: MusicGraphNode) => s.coordinate(d.x) + 0.7 * s.radius(d)
              )
              .attr("y", (d: MusicGraphNode) => s.coordinate(d.y) + s.radius(d))
              .attr("height", 25)
              .attr("width", (d: MusicGraphNode) => {
                return (
                  Math.max(d.name.length, d.artist?.length ?? 0) * 10 + "px"
                );
              });

            if ("artist" in clicked.data()) {
              tooltip
                .append("text")
                .attr("font-size", "10px")
                .attr("fill", "black")
                .attr("dy", "10px")
                .attr(
                  "x",
                  (d: MusicGraphNode) => s.coordinate(d.x) + 0.7 * s.radius(d)
                )
                .attr(
                  "y",
                  (d: MusicGraphNode) => s.coordinate(d.y) + s.radius(d)
                )
                .text((d: MusicGraphNode) => d.name);

              tooltip
                .append("text")
                .attr("font-size", "10px")
                .attr("fill", "black")
                .attr("dy", "20px")
                .attr(
                  "x",
                  (d: MusicGraphNode) => s.coordinate(d.x) + 0.7 * s.radius(d)
                )
                .attr(
                  "y",
                  (d: MusicGraphNode) => s.coordinate(d.y) + s.radius(d)
                )
                .text((d: MusicGraphNode) => `by ${d.artist ?? ""}`);
            }
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
    newNodes
      .append("circle")
      .attr("id", (d: MusicGraphNode) => d.name)
      .attr("class", (d: MusicGraphNode) => `${d.id}`)
      .attr("cx", this.coordinateX)
      .attr("cy", this.coordinateY)
      .attr("r", 0)
      .attr("opacity", 0)
      .style("stroke", (d: MusicGraphNode) =>
        // this.state.selected.has(d.id) ? "#F8FF20" : "#FFFFFF"
        this.isRecommended(d.id) || this.state.selected.has(d.id)
          ? "#F8FF20"
          : "#FFFFFF"
      )
      .attr("stroke-width", (d: MusicGraphNode) =>
        this.isRecommended(d.id)
          ? 5
          : this.baseNodeStrokeWidth / this.state.zoomK
      )
      .style("fill", (d: MusicGraphNode) => d.color ?? "white");

    // add the play icon
    newNodes
      .append("polygon")
      .attr("class", "playIcon")
      .attr("points", this.playIconCoordinates)
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
            (d.size ?? 0) * this.state.zoomK > this.largeNodeLabel
              ? "labelAlwaysVisible"
              : "label"
          }`
      )
      .attr("opacity", 0)
      .style("font-size", this.baseTextSize / this.state.zoomK + "px")
      .text((d) => d.name)
      .attr("x", this.coordinateX)
      .attr("y", this.coordinateY)
      .attr("fill", "white")
      .style("stroke", "#DCDCDC")
      .style("stroke-width", 0.4 / this.state.zoomK)
      .style("visibility", (d: MusicGraphNode) =>
        (d.size ?? 0) * this.state.zoomK > this.largeNodeLabel
          ? "visible"
          : "hidden"
      );

    // animate entering nodes and labels
    newNodes
      .select("circle")
      .transition("enter")
      .duration(this.transitionDuration)
      .attr("r", this.radius)
      .style("opacity", 0.8);

    newNodes
      .select("polygon")
      .transition("enter")
      .duration(this.transitionDuration)
      .style("opacity", 0.8);

    newNodes
      .select("text")
      .transition("enter")
      .duration(this.transitionDuration)
      .attr("opacity", 1);

    // update the link data
    const links = this.graph
      .selectAll(".links")
      .selectAll<SVGGElement, MusicGraphLink>(".link")
      .data(data.links, (d) => d.id);

    // remove links that are no longer required
    links
      .exit()
      .transition("exit")
      .duration(this.transitionDuration)
      .style("opacity", 0.6)
      .remove();

    // update the position for links that will survive the update
    links
      .select("line")
      .attr("x1", (d: MusicGraphLink) => this.coordinate(d.x1))
      .attr("y1", (d: MusicGraphLink) => this.coordinate(d.y1))
      .attr("x2", (d: MusicGraphLink) => this.coordinate(d.x2))
      .attr("y2", (d: MusicGraphLink) => this.coordinate(d.y2));

    // add links that were not in the graph before
    const newLinks = links
      .enter()
      .append("line")
      .attr("class", (d: MusicGraphLink) => `link ${d.name}-${d.id}`)
      .style("stroke", "#FFFFFF")
      .style("stroke-opacity", 0.6)
      .style("stroke-width", "0px")
      .attr("x1", (d: MusicGraphLink) => this.coordinate(d.x1))
      .attr("y1", (d: MusicGraphLink) => this.coordinate(d.y1))
      .attr("x2", (d: MusicGraphLink) => this.coordinate(d.x2))
      .attr("y2", (d: MusicGraphLink) => this.coordinate(d.y2));

    // animate entering of new links
    newLinks
      .transition("enter")
      .duration(this.transitionDuration)
      .style("stroke-opacity", 0.6)
      .style(
        "stroke-width",
        Math.max(0.4, this.baseLinkStrokeWidth / this.state.zoomK) + "px"
      );

    // nodes.merge(newNewNodes).call(pulse)
    const backgroundGradient = this.svg.select("defs").select("#mainGradient");
    const gradient = this.gradients[this.state.levelType];
    if (gradient) {
      backgroundGradient.select(".stop-left").attr("stop-color", gradient[0]);
      backgroundGradient.select(".stop-right").attr("stop-color", gradient[1]);
    }
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
      this.loadGraphData();
      this.updateGraph(this.state.data);
    }
    // if (
    //   prevProps.dimx !== this.props.dimx ||
    //   prevProps.dimy !== this.props.dimy ||
    //   prevState.x !== this.state.x ||
    //   prevState.y !== this.state.y ||
    //   prevState.y !== this.state.y ||
    //   prevState.zoom !== this.state.zoom ||
    //   prevState.zoomLevel !== this.state.zoomLevel ||
    //   prevState.levelType !== this.state.levelType
    // ) {
    //   this.loadGraphData();
    //   this.updateGraph(this.state.data);
    // }
    // if (
    //   prevState.data !== this.state.data ||
    //   prevProps.width !== this.props.width ||
    //   prevProps.height !== this.props.height
    // ) {
    //   this.updateGraph(this.state.data);
    //   this.updateAxis(this.transform);
    // }
    // }
    if (prevState.recommendations !== this.state.recommendations) {
      this.highlightRecommendations();
    }
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

  highlightRecommendations() {
    const s = this;
    this.graph
      .selectAll(".nodes")
      .selectAll<SVGGElement, MusicGraphNode>(".node")
      .select("circle")
      .style("stroke", (d: MusicGraphNode) =>
        this.isRecommended(d.id)
          ? "#800080"
          : this.state.selected.has(d.id)
          ? "#F8FF20"
          : "#FFFFFF"
      )
      .attr("stroke-width", (d: MusicGraphNode) =>
        this.isRecommended(d.id)
          ? 5
          : s.state.selected.has(d.id)
          ? 5
          : this.baseNodeStrokeWidth
      );
  }

  componentDidMount() {
    this.svg = d3
      .select<SVGSVGElement, MusicGraph>("#graph-container")
      .append("svg")
      .attr("id", "graph")
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
