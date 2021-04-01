import React, { Component } from "react";
import "./Slider.sass";

class Slider extends Component<
  { id: string; min?: number; onUpdate?: any },
  any
> {
  constructor(props: any) {
    super(props);
    this.state = {
      x: props.min || 0,
      config: {},
    };
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  componentDidMount() {
    setTimeout(() => {
      const sliderBar = document.getElementById(this.props.id);
      sliderBar && sliderBar.addEventListener("dragstart", this.onMouseDown);
      sliderBar && sliderBar.addEventListener("dragend", this.onMouseUp);
    }, 0);
  }

  onMouseDown(e: any) {
    console.log("Slider drag start at ", e.clientX);
    this.state.config.start = e.clientX;
  }

  onMouseUp(e: any) {
    console.log("Slider drag end at ", e.clientX);
    let x: number = this.state.x - this.state.config.start + e.clientX;
    const min: number = this.props.min || 0;
    if (x < min) x = min;
    if (x > 200) x = 200;

    this.props.onUpdate(x);
    this.setState({ x });
  }

  render() {
    return (
      <div className="slider-container">
        <div
          draggable="true"
          id={this.props.id}
          className="slider-bar"
          style={{ left: this.state.x + "px" }}
        />
      </div>
    );
  }
}

export default Slider;
