import React, { Component } from "react";
import * as d3 from "d3";
import "./Minimap.sass";
import Heatmap, { HeatmapData } from "../heatmap/Heatmap";
import { Margin } from "../../common";

export type MinimapData = HeatmapData;

type MinimapProps = {
  enabled: boolean;
  width: number;
  height: number;
  margin?: Margin;
  data: MinimapData;
};

type Position = {
  x: number;
  y: number;
};

type MinimapState = {
  pos: Position;
  rel: Position | null;
  zoom: number;
  dragging: boolean;
};

class Minimap extends Component<MinimapProps, MinimapState> {
  private minimap = React.createRef<HTMLDivElement>();

  constructor(props: MinimapProps) {
    super(props);
    this.state = {
      pos: {
        x: 0,
        y: 0,
      },
      rel: null,
      zoom: 0,
      dragging: false,
    };
  }

  componentDidUpdate = (props: MinimapProps, state: MinimapState) => {
    if (this.state.dragging && !state.dragging) {
      console.log("adding the listeners");
      document.addEventListener("mousemove", this.onMouseMove);
      document.addEventListener("mouseup", this.onMouseUp);
    } else if (!this.state.dragging && state.dragging) {
      document.removeEventListener("mousemove", this.onMouseMove);
      document.removeEventListener("mouseup", this.onMouseUp);
    }
  };

  componentDidMount = () => {
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  }

  onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const pos = this.minimap?.current?.getBoundingClientRect();
    if (!pos) return;
    this.setState({
      dragging: true,
      rel: {
        x: e.pageX - pos.left,
        y: e.pageY - pos.top,
      },
    });
    e.stopPropagation();
    e.preventDefault();
  };

  onMouseUp = (e: MouseEvent) => {
    this.setState({ dragging: false });
    e.stopPropagation();
    e.preventDefault();
  };

  onMouseMove = (e: MouseEvent) => {
    if (!this.state.dragging) return;
    if (!this.state.rel) return;
    this.setState({
      pos: {
        x: e.pageX - this.state.rel.x,
        y: e.pageY - this.state.rel.y,
      },
    });
    e.stopPropagation();
    e.preventDefault();
  };

  render() {
    return (
      <div className="minimap" ref={this.minimap}>
        <div className="minimap-selection"></div>
        <Heatmap
          enabled={this.props.enabled}
          data={this.props.data}
          width={this.props.width}
          height={this.props.height}
        ></Heatmap>
      </div>
    );
  }
}

export default Minimap;
