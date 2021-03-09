import React, { Component } from "react";
import "./Minimap.sass";
import Heatmap, { HeatmapData } from "../heatmap/Heatmap";
import { Margin, Size, Position } from "../../common";
import { clip } from "../../utils";

export type MinimapData = HeatmapData;

type MinimapProps = {
  enabled: boolean;
  width: number;
  height: number;
  margin?: Margin;
  data: MinimapData;
  onUpdate?: (pos: Position, size: Size) => void;
};

type MinimapState = {
  style: { left: number; top: number; width: number; height: number };
  pos: Position;
  rel: Position | null;
  size: Size;
  zoom: number;
  dragging: boolean;
};

class Minimap extends Component<MinimapProps, MinimapState> {
  private minimap = React.createRef<HTMLDivElement>();

  constructor(props: MinimapProps) {
    super(props);
    const size = {
      width: 40,
      height: 40,
    };
    this.state = {
      style: { left: 0, top: 0, width: size.width, height: size.height },
      pos: {
        x: 0,
        y: 0,
      },
      size: size,
      rel: null,
      zoom: 0,
      dragging: false,
    };
  }

  componentDidMount = () => {
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
  };

  componentWillUnmount = () => {
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
  };

  onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const pos = this.minimap?.current?.getBoundingClientRect();
    if (!pos) return;
    // this.resize({ width: 10, height: 10 });
    this.setState({
      dragging: true,
      rel: {
        x: pos.x,
        y: pos.y,
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
    const left = clip(
      e.pageX - this.state.rel.x,
      0,
      this.props.width - this.state.size.width
    );
    const top = clip(
      e.pageY - this.state.rel.y,
      0,
      this.props.height - this.state.size.height
    );
    const pos = { x: top, y: left };
    this.setState({
      style: {
        top,
        left,
        width: this.state.size.width,
        height: this.state.size.height,
      },
      pos,
    });
    if (this.props.onUpdate) this.props.onUpdate(pos, this.state.size);
    e.stopPropagation();
    e.preventDefault();
  };

  resize = (size: Size) => {
    this.setState((state) => {
      const pos = {
        x: state.pos.x + (state.size.width - size.width) / 2,
        y: state.pos.y + (state.size.height - size.height) / 2,
      };
      return {
        style: {
          left: pos.x,
          top: pos.y,
          width: size.width,
          height: size.height,
        },
        size,
        pos,
      };
    });
  };

  render() {
    return (
      <div className="minimap">
        <div ref={this.minimap}>
          <Heatmap
            enabled={this.props.enabled}
            data={this.props.data}
            width={this.props.width}
            height={this.props.height}
          >
            <div className="minimap-selection" style={this.state.style}></div>
          </Heatmap>
        </div>
      </div>
    );
  }
}

export default Minimap;
