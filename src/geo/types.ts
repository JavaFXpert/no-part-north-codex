export type Coordinates = {
  lat: number;
  lng: number;
};

export type Preset = Coordinates & {
  id: string;
  name: string;
  shortName: string;
};
