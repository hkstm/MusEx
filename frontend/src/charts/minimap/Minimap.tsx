import React, { Component } from "react";
import "./Minimap.sass";
import Heatmap, { HeatmapData } from "../heatmap/Heatmap";
import { Margin, Size, Position } from "../../common";
import { clip } from "../../utils";

export type MinimapData = HeatmapData;

type MinimapProps = {
  enabled: boolean;
  pos: Position;
  size: Size;
  width: number;
  height: number;
  margin?: Margin;
  data: MinimapData;
  onUpdate?: (pos: Position, size: Size) => void;
};

type MinimapState = {
  rel: Position | null;
  zoom: number;
  dragging: boolean;
};

class Minimap extends Component<MinimapProps, MinimapState> {
  private minimap = React.createRef<HTMLDivElement>();

  constructor(props: MinimapProps) {
    super(props);
    console.log(this.props);
    this.state = {
      rel: null,
      zoom: 0,
      dragging: false,
    };
  }

  componentDidMount = () => {
    const minimap = document.getElementById('graph-minimap');
    minimap && minimap.addEventListener("mousedown", this.onMouseDown);
    minimap && minimap.addEventListener("mousemove", this.onMouseMove);
    minimap && minimap.addEventListener("mouseup", this.onMouseUp);
  };

  componentWillUnmount = () => {
    const minimap = document.getElementById('graph-minimap');
    minimap && minimap.removeEventListener("mousedown", this.onMouseDown);
    minimap && minimap.removeEventListener("mousemove", this.onMouseMove);
    minimap && minimap.removeEventListener("mouseup", this.onMouseUp);
  };

  onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const pos = this.minimap?.current?.getBoundingClientRect();
    if (!pos) return;
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
      this.props.width - this.props.size.width
    );
    const top = clip(
      e.pageY - this.state.rel.y,
      0,
      this.props.height - this.props.size.height
    );
    if (isNaN(top) || isNaN(left)) return {};
    const pos = {
      x: this.props.size.width / 2 + left,
      y: this.props.size.height / 2 + top,
    };
    if (this.props.onUpdate) this.props.onUpdate(pos, this.props.size);
    e.stopPropagation();
    e.preventDefault();
  };

  render() {
    return (
      <div
        id="graph-minimap"
        className="minimap"
        style={{ width: this.props.width, height: this.props.height }}
      >
        <div ref={this.minimap}>
          <Heatmap
            enabled={this.props.enabled}
            data={this.props.data}
            width={this.props.width}
            height={this.props.height}
          >
            <div
              key="minimap-selection"
              className="minimap-selection"
              style={{
                width: clip(this.props.width, 1, this.props.size.width),
                height: clip(this.props.size.height, 1, this.props.height),
                left: clip(
                  this.props.pos.x - this.props.size.width / 2,
                  0,
                  this.props.width
                ),
                top: clip(
                  this.props.pos.y - this.props.size.height / 2,
                  0,
                  this.props.height
                ),
              }}
            ></div>
          </Heatmap>
        </div>
      </div>
    );
  }
}

export default Minimap;
