import React, { Component } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpandAlt } from "@fortawesome/free-solid-svg-icons";
import { faCompressAlt } from "@fortawesome/free-solid-svg-icons";
import "./widget.sass";

type WidgetProps = {};

type WidgetState = {
  fullscreen: boolean;
};

class Widget extends Component<WidgetProps, WidgetState> {
  constructor(props: WidgetProps) {
    super(props);
    this.state = {
      fullscreen: false,
    };
    this.toggleScreen = this.toggleScreen.bind(this);
    this.onEsc = this.onEsc.bind(this);
  }

  componentDidMount() {
    document.addEventListener("keydown", this.onEsc);
  }

  onEsc(e: any) {
    const body: any = document.querySelector("body");
    body.style.overflow = "inherit";
    e.key === "Escape" &&
      this.setState({
        fullscreen: false,
      });
  }

  toggleScreen() {
    const body: any = document.querySelector("body");
    body.style.overflow = this.state.fullscreen ? "inherit" : "hidden";
    this.setState({
      fullscreen: !this.state.fullscreen,
    });
  }

  render() {
    return (
      <div
        className={
          this.state.fullscreen ? "widget-fullscreen" : "widget-container"
        }
      >
        <div className="toggle-button" onClick={this.toggleScreen}>
          {!this.state.fullscreen ? (
            <FontAwesomeIcon className="icon" icon={faExpandAlt} />
          ) : (
            <FontAwesomeIcon className="icon" icon={faCompressAlt} />
          )}
        </div>
        {this.props.children}
      </div>
    );
  }
}

export default Widget;
