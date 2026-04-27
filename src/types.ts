export interface Node {
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface Link {
  source: number | Node;
  target: number | Node;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface NavigationResult {
  path: number[];
  distance: number;
}
