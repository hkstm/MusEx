import React, { Component } from "react";
import "./Select.sass";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

type SelectState = {
  isOpen: boolean;
  selected?: string;
};

type SelectProps = {
  id?: string;
  default?: string;
  onChange: (dim: string) => void;
  options: string[];
};

export default class Select extends Component<SelectProps, SelectState> {
  constructor(props: SelectProps) {
    super(props);
    this.state = {
      isOpen: false,
    };
  }

  toggling = () => {
    this.setState((state) => {
      return { isOpen: !state.isOpen };
    });
  };

  onOptionClicked = (value: string) => () => {
    // console.log("selecting", value);
    this.setState({ selected: value });
    this.setState({ isOpen: false });
    this.props.onChange(value);
  };

  componentDidUpdate(prevProps: SelectProps) {
    // console.log(this.props.default, this.state.selected, this.props.options);
    if (this.props.default !== prevProps.default || this.props.options !== prevProps.options) {
      if (
        this.props.default !== undefined &&
        this.state.selected == undefined &&
        this.props.options.includes(this.props.default)
      ) {
        this.onOptionClicked(this.props.default)();
      }
    }
  }

  render() {
    return (
      <div id={this.props.id} className="dropdown-container">
        <div className="dropdown-header" onClick={this.toggling}>
          {this.state.selected || this.props.options[0]}
          <FontAwesomeIcon className="icon" icon={faCaretDown} />
        </div>
        {this.state.isOpen && (
          <div className="dropdown-list-container">
            <div className="dropdown-list">
              {this.props.options.map((option) => (
                <div
                  className="dropdown-list-item"
                  onClick={this.onOptionClicked(option)}
                  key={Math.random()}
                >
                  {option}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
