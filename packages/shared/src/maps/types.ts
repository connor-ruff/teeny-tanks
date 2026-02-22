export interface WallRect {
  x: number;      // left edge, arena coordinates
  y: number;      // top edge, arena coordinates
  width: number;
  height: number;
}

export interface MapDefinition {
  name: string;
  width: number;   // arena width in pixels
  height: number;  // arena height in pixels
  walls: WallRect[];
}
