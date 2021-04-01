import React, { Component } from "react";
import * as d3 from "d3";
import "./Heatmap.sass";
import { Margin } from "../../common";

export type HeatmapTile = {
  x: number;
  y: number;
  value: number;
  title?: string;
};

export type HeatmapData = {
  tiles: HeatmapTile[];
  xSize: number;
  ySize: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

type HeatmapProps = {
  enabled: boolean;
  width: number;
  height: number;
  margin?: Margin;
  data: HeatmapData;
  showTooltip?: boolean;
  showAxis?: boolean;
  legend?: string[];
};

type HeatmapState = {};

class Heatmap extends Component<HeatmapProps, HeatmapState> {
  svg!: d3.Selection<SVGElement, HeatmapTile, HTMLElement, any>;

  constructor(props: HeatmapProps) {
    super(props);
    this.state = {};
  }

  componentDidUpdate(prevProps: HeatmapProps) {
    if (prevProps.data !== this.props.data) {
      this.updateHeatmap();
    }
  }

  addHeatmap = () => {
    this.svg = d3.select<SVGElement, HeatmapTile>("#heatmap-svg");
    this.svg.append("g").attr("class", "heatmap");

    this.svg.append("g").attr("class", "y axis");
    this.svg.append("g").attr("class", "x axis");
    // .attr("transform", `translate(${this.scalePadding},0)`);
  };

  updateHeatmap() {
    console.log("data is ", this.props.data);

    const myColor = (n: number) => {
      var shade = n * 255;
      return `rgb(${255 - shade}, ${255 - shade}, ${255})`;
    };

    const x = d3
      .scaleBand<number>()
      .padding(0.01)
      .range([0, this.props.width])
      .domain(
        Array(this.props.data.xSize)
          .fill(0)
          .map((_, idx) => idx)
      );

    const y = d3
      .scaleBand<number>()
      .padding(0.01)
      .range([0, this.props.height])
      .domain(
        Array(this.props.data.ySize)
          .fill(0)
          .map((_, idx) => idx)
      );

    if (this.props.showAxis) {
      this.svg.select<SVGGElement>(".x.axis").call(d3.axisBottom(x));
      this.svg.select<SVGGElement>(".y.axis").call(d3.axisLeft(y));
    }

    this.svg
      .attr(
        "width",
        this.props.width +
          (this.props.margin?.right ?? 0) +
          (this.props.margin?.left ?? 0)
      )
      .attr(
        "width",
        this.props.height +
          (this.props.margin?.top ?? 0) +
          (this.props.margin?.bottom ?? 0)
      );

    const tiles = this.svg
      .selectAll<SVGGElement, HeatmapTile>(".heatmap")
      .selectAll<SVGGElement, HeatmapTile>(".tile")
      .data(this.props.data.tiles, (d: HeatmapTile) => d.title ?? "test");

    // remove the ones that are no longer in the data
    tiles
      .exit()
      .transition("exit")
      .duration(100)
      .attr("r", 0)
      .style("opacity", 0)
      .remove();

    // update the tiles that survived the upate
    tiles.attr(
      "transform",
      `translate(${this.props.margin?.left ?? 0},${
        this.props.margin?.top ?? 0
      })`
    );

    // add the new tiles
    const newTiles = tiles.enter().append("rect").attr("class", "tile");

    if (this.props.showTooltip) {
      const tooltip = d3
        .select(".heatmap-container")
        .append("div")
        .style("opacity", 0)
        .attr("class", "heatmap-tooltip");

      const mouseover = (d: MouseEvent) => {
        tooltip.style("opacity", 1);
      };

      const mousemove = (d: MouseEvent, data: HeatmapTile) => {
        tooltip
          .html(data.value + " " + data.x + " records sold in " + data.y)
          .style("left", d.clientX + 20 + "px")
          .style("top", d.clientY - 150 + "px");
      };

      const mouseleave = (even: MouseEvent) => {
        tooltip.style("opacity", 0);
      };

      tiles
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);
    }

    newTiles
      .attr("x", (d: HeatmapTile) => x(d.x) ?? 0)
      .attr("y", (d: HeatmapTile) => y(d.y) ?? 0)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .style("fill", (d: HeatmapTile) => myColor(d.value));
    // .transition()
    // .duration(500)
  }

  componentDidMount() {
    this.addHeatmap();
    this.updateHeatmap();
  }

  render() {
    return (
      <div className="heatmap-container">
        {this.props.children}
        <svg id="heatmap-svg"></svg>
        <div className="heatmap-legend">
          <div className="heatmap-gradient-legend" />
          {this.props.legend?.map((l) => (
            <div key={l} className="heatmap-legend"></div>
          ))}
        </div>
      </div>
    );
  }
}

export default Heatmap;
