import React, { Component } from "react";
import { Maximize2, Minimize2 } from 'react-feather';
import "./widget.css";

type WidgetState = {
    fullscreen: boolean;
  };
  
class Widget extends Component<{}, WidgetState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      fullscreen: false
    };
    this.toggleScreen = this.toggleScreen.bind(this);
    this.onEsc = this.onEsc.bind(this)
  }

  componentDidMount() {
      document.addEventListener('keydown', this.onEsc)
  }

  onEsc(e: any){
      const body:any = document.querySelector('body');
      body.style.overflow = 'inherit';
      e.key === 'Escape' && this.setState({
          fullscreen: false
      })
  }

  toggleScreen() {
      const body:any = document.querySelector('body');
      body.style.overflow = this.state.fullscreen? 'inherit': 'hidden';
      this.setState({
          fullscreen: !this.state.fullscreen
      });
  }

  render() {
    return (
        <div className={this.state.fullscreen? "widget-fullscreen" : "widget-container"}>
            <div className='toggle-button' onClick={this.toggleScreen}> 
                {!this.state.fullscreen ? <Maximize2/> : <Minimize2/>}
                {/* {!this.state.fullscreen ? <Maximize/> : <Minimize/>} */}
                {/* {!this.state.fullscreen ? <ExternalLink/> : <MinusCircle/>} */}
            </div>
            {this.props.children}
        </div>
    );
  }
}

export default Widget;
