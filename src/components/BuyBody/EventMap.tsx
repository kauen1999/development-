import React from "react";

interface Sector {
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

interface EventMapProps {
  mapConfig: EventMapConfig;
  onSelect: (sector: string, row: string, seat: number, price: number) => void;
  selectedSeats: { sector: string; row: string; seat: number }[];
  maxReached: boolean;
  // Renomeado para refletir que são apenas assentos vendidos
  soldSeats?: { sector: string; row: string; seat: number }[];
}

export const EventMap: React.FC<EventMapProps> = ({
  mapConfig,
  onSelect,
  selectedSeats,
  maxReached,
  soldSeats = [],
}) => {
  const isSeatSelected = (sector: string, row: string, seat: number) =>
    selectedSeats.some(
      (s) => s.sector === sector && s.row === row && s.seat === seat
    );

  const isSeatSold = (sector: string, row: string, seat: number) =>
    soldSeats.some(
      (s) => s.sector === sector && s.row === row && s.seat === seat
    );

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold">{mapConfig.name}</h2>
      {mapConfig.sectors.map((sec) => (
        <div key={sec.id} className="mb-4">
          <h3>{sec.name}</h3>
          {sec.rows.map((row) => (
            <div key={row} className="mb-1 flex items-center gap-1">
              <span className="w-16">{`${sec.id}${row}`}</span>
              {[...Array(mapConfig.seatsPerRow)].map((_, si) => {
                const seat = si + 1;
                const fullRow = `${sec.id}${row}`;
                const selected = isSeatSelected(sec.name, fullRow, seat);
                const sold = isSeatSold(sec.name, fullRow, seat);
                const price = sec.pricesByRow?.[row] ?? 0;

                const isDisabled =
                  sold || price <= 0 || (maxReached && !selected);

                return (
                  <button
                    key={seat}
                    disabled={isDisabled}
                    onClick={() =>
                      onSelect(sec.name, fullRow, seat, price)
                    }
                    className={`h-8 w-8 rounded transition
                      ${
                        isDisabled
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : selected
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 hover:bg-blue-300"
                      }
                      ${maxReached && !selected ? "opacity-50" : ""}`}
                    title={
                      sold
                        ? `Indisponível (vendido)`
                        : `Setor ${sec.name}, fila ${row}, assento ${seat}`
                    }
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
