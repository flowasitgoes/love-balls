export interface StaticBody {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
}

export interface Level {
  id: number;
  name: string;
  width: number;
  height: number;
  staticBodies: StaticBody[];
  blueBall: Ball;
  orangeBall: Ball;
}

