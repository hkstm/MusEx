import React, { Component } from "react";
import "./Select.sass";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCaretDown } from '@fortawesome/free-solid-svg-icons'

type SelectState = {
  isOpen: boolean;
  selected?: string;
};

type SelectProps = {
  id?: string;
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
    this.setState({ selected: value });
    this.setState({ isOpen: false });
  };

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
  };
}
