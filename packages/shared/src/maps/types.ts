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

  // Respawn corner positions — two per team (left corner, right corner of their side).
  // Destroyed tanks respawn at one of these randomly instead of near their flag.
  redRespawnPositions: [{ x: number; y: number }, { x: number; y: number }];
  blueRespawnPositions: [{ x: number; y: number }, { x: number; y: number }];
}
