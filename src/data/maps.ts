// src/data/maps.ts

// Tipos usados no mapa
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

// seats vem do banco (via tRPC ou fetch)
type Seat = {
  id: string;
  label: string;  // "A1", "A2"
  row: string;    // "A"
  number: number; // 1..N
  ticketCategory: { id: string; name: string; price: number };
};

// Gera configuração de mapa dinamicamente a partir dos seats
export function generateMapFromSeats(seats: Seat[]): EventMapConfig {
  const seatsPerRow = 10;

  const sectors = Object.values(
    seats.reduce((acc, seat) => {
      const categoryName = seat.ticketCategory.name;

      if (!acc[categoryName]) {
        acc[categoryName] = {
          id: seat.ticketCategory.id,
          name: categoryName,
          rows: [],
          pricesByRow: {},
        };
      }

      if (!acc[categoryName].rows.includes(seat.row)) {
        acc[categoryName].rows.push(seat.row);
        acc[categoryName].pricesByRow[seat.row] = seat.ticketCategory.price;
      }

      return acc;
    }, {} as Record<string, { id: string; name: string; rows: string[]; pricesByRow: Record<string, number> }>)
  );

  return {
    name: "Mapa dinámico",
    seatsPerRow,
    sectors,
  };
}
