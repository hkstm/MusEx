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
  // style: { left: number; top: number; width: number; height: number };
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
      // style: {
      //   left: this.props.pos.x,
      //   top: this.props.pos.y,
      //   width: this.props.size.width,
      //   height: this.props.size.height,
      // },
      rel: null,
      zoom: 0,
      dragging: false,
    };
  }

  componentDidUpdate(prevProps: MinimapProps) {
    if (
      prevProps.pos !== this.props.pos ||
      prevProps.size !== this.props.size
    ) {
      // console.log("new minimap size is", this.props.size, this.props.pos);
      // this.setState((state) => {
      //   if (isNaN(this.props.pos.x) || isNaN(this.props.pos.y)) return {};
      //   return {
      //     style: {
      //       left: this.props.pos.x,
      //       top: this.props.pos.y,
      //       width: this.props.size.width,
      //       height: this.props.size.height,
      //     },
      //   };
      // });
    }
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
    // const left = clip(
    //   e.pageX - this.state.rel.x,
    //   0,
    //   this.props.width - this.props.size.width
    // );
    // const top = clip(
    //   e.pageY - this.state.rel.y,
    //   0,
    //   this.props.height - this.props.size.height
    // );
    // console.log(e.pageX - this.state.rel.x);
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
    // this.setState({
    //   style: {
    //     top,
    //     left,
    //     width: this.props.size.width,
    //     height: this.props.size.height,
    //   },
    // });
    const pos = {
      x: this.props.size.width / 2 + left,
      y: this.props.size.height / 2 + top,
    };
    if (this.props.onUpdate) this.props.onUpdate(pos, this.props.size);
    e.stopPropagation();
    e.preventDefault();
  };

  // resize = (size: Size) => {
  //   this.setState((state) => {
  //     const pos = {
  //       x: state.pos.x + (state.size.width - size.width) / 2,
  //       y: state.pos.y + (state.size.height - size.height) / 2,
  //     };
  //     if (isNaN(pos.x) || isNaN(pos.y)) return {};
  //     return {
  //       style: {
  //         left: pos.x,
  //         top: pos.y,
  //         width: size.width,
  //         height: size.height,
  //       },
  //     };
  //   });
  // };

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
                width: this.props.size.width,
                height: this.props.size.height,
                left: this.props.pos.x - this.props.size.width / 2,
                top: this.props.pos.y - this.props.size.height / 2,
              }}
            ></div>
          </Heatmap>
        </div>
      </div>
    );
  }
}

export default Minimap;
