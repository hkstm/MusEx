import * as d3 from "d3";
import { NodeType } from "../common";

export interface MusicGraphNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  name: string;
  type: NodeType;
  genre?: string[];
  artists?: { name: string }[];
  size?: number;
  preview_url?: string;
  color?: string;
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
