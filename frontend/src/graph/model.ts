import * as d3 from 'd3';

export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  group: number;
  r?: number;
};

export interface D3Link {
  source: string;
  target: string;
  value: number;
};

export interface D3Graph {
  nodes: D3Node[];
  links: D3Link[];
};
