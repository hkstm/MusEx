import * as d3 from "d3";

export interface MusicGraphNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  name: string;
  type: "Artist" | "Track" | "Genre";
  genre?: string[];
  artist?: string;
  size?: number;
  preview_url?: string;
  color?: number;
}

export interface MusicGraphLink {
  src: string;
  dest: string;
  name: string;
  color: string;
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MusicGraph {
  limit?: number;
  dimx?: string;
  dimy?: string;
  nodes: MusicGraphNode[];
  links: MusicGraphLink[];
}
