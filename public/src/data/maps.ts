export interface Sector {
  id: string;
  name: string;
  rows: number;
  pricesByRow: { [row: number]: number };
}

export interface EventMapConfig {
  name: string;
  seatsPerRow: number;
  sectors: Sector[];
}

export const eventMaps: { [key: string]: EventMapConfig } = {
  belgrano: {
    name: "Teatro Belgrano - Buenos Aires",
    seatsPerRow: 10,
    sectors: [
      {
        id: "A",
        name: "Platea A",
        rows: 5,
        pricesByRow: { 1: 450, 2: 440, 3: 430, 4: 420, 5: 400 },
      },
      {
        id: "B",
        name: "Platea B",
        rows: 5,
        pricesByRow: { 1: 390, 2: 380, 3: 370, 4: 360, 5: 350 },
      },
      {
        id: "C",
        name: "Platea C",
        rows: 3,
        pricesByRow: { 1: 320, 2: 300, 3: 280 },
      },
      { id: "P", name: "Pullman", rows: 2, pricesByRow: { 1: 250, 2: 230 } },
    ],
  },

  colon: {
    name: "Teatro Colón - Buenos Aires",
    seatsPerRow: 12,
    sectors: [
      {
        id: "OR",
        name: "Orquestra",
        rows: 6,
        pricesByRow: { 1: 1200, 2: 1150, 3: 1100, 4: 1050, 5: 1000, 6: 950 },
      },
      {
        id: "PB",
        name: "Platea Baixa",
        rows: 4,
        pricesByRow: { 1: 900, 2: 850, 3: 800, 4: 750 },
      },
      {
        id: "PA",
        name: "Platea Alta",
        rows: 3,
        pricesByRow: { 1: 650, 2: 600, 3: 550 },
      },
    ],
  },

  rosario: {
    name: "Teatro El Círculo - Rosario",
    seatsPerRow: 8,
    sectors: [
      {
        id: "FR",
        name: "Frontal",
        rows: 4,
        pricesByRow: { 1: 500, 2: 480, 3: 460, 4: 440 },
      },
      {
        id: "LT",
        name: "Lateral",
        rows: 4,
        pricesByRow: { 1: 420, 2: 400, 3: 380, 4: 360 },
      },
      { id: "GA", name: "Galeria", rows: 2, pricesByRow: { 1: 300, 2: 280 } },
    ],
  },

  cordoba: {
    name: "Teatro Libertador - Córdoba",
    seatsPerRow: 9,
    sectors: [
      {
        id: "PR",
        name: "Plateia",
        rows: 5,
        pricesByRow: { 1: 600, 2: 580, 3: 560, 4: 540, 5: 520 },
      },
      { id: "PL", name: "Palco", rows: 2, pricesByRow: { 1: 500, 2: 480 } },
      {
        id: "GA",
        name: "Galeria",
        rows: 3,
        pricesByRow: { 1: 400, 2: 380, 3: 360 },
      },
    ],
  },

  mendoza: {
    name: "Auditorio Bustelo - Mendoza",
    seatsPerRow: 10,
    sectors: [
      {
        id: "VI",
        name: "VIP",
        rows: 3,
        pricesByRow: { 1: 550, 2: 530, 3: 500 },
      },
      {
        id: "GE",
        name: "General",
        rows: 5,
        pricesByRow: { 1: 450, 2: 430, 3: 410, 4: 390, 5: 370 },
      },
    ],
  },

  salta: {
    name: "Teatro Provincial - Salta",
    seatsPerRow: 8,
    sectors: [
      {
        id: "PL",
        name: "Platea",
        rows: 4,
        pricesByRow: { 1: 420, 2: 400, 3: 380, 4: 360 },
      },
      { id: "GA", name: "Galeria", rows: 2, pricesByRow: { 1: 300, 2: 280 } },
    ],
  },
};

export default eventMaps;