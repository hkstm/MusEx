export type Margin = {
  right?: number;
  left?: number;
  top?: number;
  bottom?: number;
};

export type Position = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type NodeType = "genre" | "artist" | "track";
export type Genre = {
  text: string;
  value: number;
};

export type Node = {};

export const apiVersion = "v2";

export const headerConfig = {
  headers: { "Access-Control-Allow-Origin": "*" },
};
