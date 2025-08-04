// src/data/maps.ts
export interface Sector {
  id: string;
  name: string;
  rows: string[];
  pricesByRow: { [row: string]: number };
}

export interface EventMapConfig {
  name: string;
  seatsPerRow: number;
  sectors: Sector[];
}

export const eventMaps: { [key: string]: EventMapConfig } = {
  belgrano: {
    name: "Teatro",
    seatsPerRow: 10,
    sectors: [
      {
        id: "A",
        name: "Platea A",
        rows: ["1", "2", "3", "4", "5"],
        pricesByRow: { "1": 450, "2": 440, "3": 430, "4": 420, "5": 400 },
      },
      {
        id: "B",
        name: "Platea B",
        rows: ["1", "2", "3", "4", "5"],
        pricesByRow: { "1": 390, "2": 380, "3": 370, "4": 360, "5": 350 },
      },
      {
        id: "C",
        name: "Platea C",
        rows: ["1", "2", "3"],
        pricesByRow: { "1": 320, "2": 300, "3": 280 },
      },
      {
        id: "P",
        name: "Pullman",
        rows: ["1", "2"],
        pricesByRow: { "1": 250, "2": 230 },
      },
    ],
  },
};

export default eventMaps;
