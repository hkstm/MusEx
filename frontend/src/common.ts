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

export type Node = string[];

export type Recommendations = {
  id:  string;
  value: number;
}
