import React, { Component } from "react";
import axios from "axios";
import { headerConfig, apiVersion } from "../common";
import { MusicGraphNode } from "./model";
import Graph, { GraphDataDimensions } from "./Graph";
import Select from "../Select";
import "./GraphControls.sass";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

type SearchResult = {
  matches: MusicGraphNode[];
};

type GraphControlProps = {
  graphWidth: number;
  graphHeight: number;
};

type GraphControlState = {
  dimensions: GraphDataDimensions;
  dimx?: string;
  dimy?: string;
  helpMenuOpened: boolean;
  foundNode?: MusicGraphNode;
  searchResults: MusicGraphNode[];
  searchQuery: string;
  searchType: string;
};

class GraphControl extends Component<GraphControlProps, GraphControlState> {
  zoomLevels = 6;

  constructor(props: GraphControlProps) {
    super(props);
    this.state = {
      dimensions: {},
      helpMenuOpened: false,
      searchResults: [],
      searchQuery: "",
      searchType: "artist",
    };
  }

  openHelp = (event?: React.FormEvent) => {
    this.setState({ helpMenuOpened: true });
    event?.preventDefault();
  };

  closeHelp = (event?: React.FormEvent) => {
    this.setState({ helpMenuOpened: false });
    event?.preventDefault();
  };

  setSearchQuery = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState({ searchQuery: target.value });
  };

  handleDimYChange = (dimy: string) => {
    console.log("changed y dim to", dimy);
    this.setState({ dimy });
  };

  handleDimXChange = (dimx: string) => {
    console.log("changed x dim to", dimx);
    this.setState({ dimx });
  };

  handleSearchTypeChange = (typ: string) => {
    console.log("changed search type to", typ);
    this.setState({ searchType: typ }, this.search);
  };

  search = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    event?.nativeEvent.stopImmediatePropagation();
    if (this.state.searchQuery.length < 1) return;
    let searchURL = `http://localhost:5000/${apiVersion}/search?dimx=${this.state.dimx}&dimy=${this.state.dimy}&searchterm=${this.state.searchQuery}&type=${this.state.searchType}`;
    console.log(searchURL);
    axios.get(searchURL, headerConfig).then((res: { data: SearchResult }) => {
      this.setState({ searchResults: res.data.matches });
    });
  };

  updateDimensions = (): Promise<void> => {
    return axios
      .get(`http://localhost:5000/${apiVersion}/dimensions`, headerConfig)
      .then((res) => {
        this.setState({ dimensions: res.data });
      });
  };

  componentDidMount() {
    this.updateDimensions();
  }

  viewSearchResult = (result: MusicGraphNode) => {
    this.setState({ searchResults: [], foundNode: result });
  };

  render() {
    return (
      <div className="graph-container">
        {this.state.searchResults.length > 0 && (
          <div className="overlay search-results">
            <h3>Search Results</h3>
            <table>
              <tbody>
                {this.state.searchResults.map((result) => (
                  <tr
                    key={result.id}
                    onClick={() => this.viewSearchResult(result)}
                    style={{ backgroundColor: result.color }}
                  >
                    <td>{result.name}</td>
                    <td>{result.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {this.state.helpMenuOpened && (
          <div className="overlay help-menu">
            <h3>FAQ</h3>
            <table>
              <tr>
                <td>Need help searching for specific genres or artists?</td>
                <td>
                  Type in the top right search bar and pick from artist or genre
                </td>
              </tr>
              <tr>
                <td>
                  Want to see stats of audio features throughout the years?
                </td>
                <td>Try the slidebar underneath the heatmap!</td>
              </tr>
              <tr>
                <td>Want to focus only on the graph?</td>
                <td>
                  Click the three stacked bars next to the wordcloud to blend
                  them out!
                </td>
              </tr>
              <tr>
                <td>Need to know how to click?</td>
                <td>
                  <table>
                    <tr>
                      <td>
                        <b>LeftClick</b>
                      </td>
                      <td>
                        <i>(Un)highlight node</i>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Shift + LeftClick</b>
                      </td>
                      <td>
                        <i>Play/Stop music</i>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Double LeftClick</b>
                      </td>
                      <td>
                        <i>Zooming</i>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p className="close" onClick={this.closeHelp}>
              Got it
            </p>
          </div>
        )}
        <nav className="graph-controls">
          <span id="app-name">MusEx</span>
          <div className="dimensions">
            <Select
              id="select-dimx"
              default="energy"
              onChange={this.handleDimXChange}
              options={this.state.dimensions}
            ></Select>
            <Select
              id="select-dimy"
              default="tempo"
              onChange={this.handleDimYChange}
              options={this.state.dimensions}
            ></Select>
          </div>
          <form className="forms" onSubmit={this.search}>
            <input
              type="text"
              value={this.state.searchQuery}
              onChange={this.setSearchQuery}
              id="search-query-input"
              placeholder="Search"
            />
            <Select
              id="search-type-select"
              default="artist"
              onChange={this.handleSearchTypeChange}
              options={{ artist: {}, genre: {} }}
            ></Select>
            <button id="app-search" type="submit">
              Search
            </button>
            <FontAwesomeIcon
              id="app-help"
              className="help-icon"
              title="Help"
              icon={faInfoCircle}
              onClick={this.openHelp}
            />
          </form>
        </nav>
        {this.state.dimx === this.state.dimy ? (
          <h1>Please select two different dimensions</h1>
        ) : (
          <Graph
            enabled={true}
            highlight={this.state.foundNode}
            zoomLevels={this.zoomLevels}
            width={this.props.graphWidth}
            height={this.props.graphHeight}
            dimx={this.state.dimx}
            dimy={this.state.dimy}
            dimensions={this.state.dimensions}
          ></Graph>
        )}
      </div>
    );
  }
}

export default GraphControl;
