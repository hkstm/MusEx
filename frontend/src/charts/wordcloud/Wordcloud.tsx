import React, { Component } from "react";
import ReactWordcloud, { Word } from "react-wordcloud";
import Select from "../../Select";
import { capitalize } from "../../utils";
import { NodeType, headerConfig, apiVersion } from "../../common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./Wordcloud.sass";
import axios from "axios";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface WordcloudWord extends Word {
  color?: string;
}

const MAX_WORDCLOUD_SIZE = 50;

const options = {
  colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
  enableTooltip: true,
  deterministic: false,
  fontFamily: "impact",
  fontStyle: "normal",
  fontWeight: "normal",
  padding: 1,
  rotations: 0,
};

type WordcloudProps = {
  onWordSelected?: (word: string) => void;
};

type WordcloudState = {
  wordcloudEnabled?: boolean;
  wordcloudYear: number;
  wordcloudType: NodeType;
  wordcloudLoading: boolean;
  wordcloudData: WordcloudWord[];
};

class Wordcloud extends Component<WordcloudProps, WordcloudState> {
  wordCloudCallbacks = {
    getWordColor: (word: WordcloudWord) => word?.color ?? "white",
    onWordMouseOver: (event: WordcloudWord) => {},
    onWordClick: (event: { text: string }) => {
      if (this.props.onWordSelected) this.props.onWordSelected(event.text);
      // const attr = this.wordcloudType === "genre" ? "genre" : "name"
      // const highlighted = this.state.graph.nodes
      //   // .forEach((n) => console.log(n, event.text))
      //   .filter((n: MusicGraphNode) => n["name"].toLowerCase() == event.text.toLowerCase())
      //   .map((n: MusicGraphNode) => n["id"]);
      // console.log("highlighed", highlighted);
      // this.setState({
      //   highlighted,
      // });
    },
    getWordTooltip: (word: WordcloudWord) => "",
    // `${capitalize(word.text)} (${Math.round(word.value)})`,
  };

  constructor(props: {}) {
    super(props);
    this.state = {
      wordcloudEnabled: true,
      wordcloudLoading: true,
      wordcloudYear: 2020,
      wordcloudType: "genre",
      wordcloudData: [],
    };
  }

  handleWordcloudTypeChange = (typ: string) => {
    console.log("wordcloud type changed to", typ);
    this.setState({ wordcloudType: typ as NodeType }, this.updateWordcloud);
  };

  handleWordcloudYearChange = (event: React.FormEvent) => {
    const target = event.target as HTMLInputElement;
    this.setState(
      { wordcloudYear: parseInt(target.value) },
      this.updateWordcloud
    );
  };

  updateWordcloud = () => {
    this.setState({ wordcloudLoading: true });
    axios
      .get(
        `http://localhost:5000/${apiVersion}/most_popular?year_min=${this.state.wordcloudYear}&year_max=${this.state.wordcloudYear}&type=${this.state.wordcloudType}&limit=${MAX_WORDCLOUD_SIZE}`,
        headerConfig
      )
      .then((res) => {
        this.setState({
          wordcloudData: res.data.most_popular.map(
            (data: { popularity: number; color: string; name: string }) => {
              return {
                text: capitalize(data.name),
                value: data.popularity,
                color: data.color,
              };
            }
          ),
        });
      })
      .finally(() => this.setState({ wordcloudLoading: false }));
  };

  render() {
    return (
      <div className="app">
        <div className="wordcloud-container">
          <h3>
            Most popular{" "}
            <Select
              id="select-wordcloud-type"
              default="genre"
              onChange={this.handleWordcloudTypeChange}
              options={{ genre: {}, artist: {} }}
            ></Select>{" "}
            in{" "}
            <input
              className="numeric-input"
              id="wordcloud-year-input"
              value={this.state.wordcloudYear}
              onChange={this.handleWordcloudYearChange}
              type="number"
              placeholder="Year"
            />
            :
          </h3>
          {this.state.wordcloudLoading && (
            <FontAwesomeIcon
              className="loading-spinner icon toggle"
              id="wordcloud-loading-spinner"
              icon={faSpinner}
              spin
            />
          )}

          {this.state.wordcloudEnabled && !this.state.wordcloudLoading && (
            <ReactWordcloud
              words={this.state.wordcloudData}
              callbacks={this.wordCloudCallbacks}
              options={options}
            ></ReactWordcloud>
          )}
        </div>
      </div>
    );
  }
}

export default Wordcloud;
