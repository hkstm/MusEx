import * as d3 from "d3";

export interface MusicGraphNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  name: string;
  type: "Artist" | "Track" | "Genre";
  genre?: string[];
  size?: number;
  color?: number;
}

export interface MusicGraphLink {
  source: MusicGraphNode;
  target: MusicGraphNode;
  name?: string;
  label?: string;
  color?: string;
}

export interface MusicGraph {
  limit?: number;
  nodes: MusicGraphNode[];
  links: MusicGraphLink[];
}
