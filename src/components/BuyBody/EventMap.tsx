// src/components/BuyBody/EventMap.tsx
import React from "react";

// Ajuste: row agora é string[]
interface Sector {
  id: string;
  name: string;
  rows: string[]; // ✅ array de strings
  pricesByRow: { [row: string]: number }; // ✅ chaves são strings
}

interface MapConfig {
  name: string;
  seatsPerRow: number;
  sectors: Sector[];
}

interface EventMapProps {
  mapConfig: MapConfig;
  onSelect: (sector: string, row: string, seat: number, price: number) => void;
  selectedSeats: { sector: string; row: string; seat: number }[];
  maxReached: boolean;
}

export const EventMap: React.FC<EventMapProps> = ({
  mapConfig,
  onSelect,
  selectedSeats,
  maxReached,
}) => {
  const isSeatSelected = (sector: string, row: string, seat: number) =>
    selectedSeats.some(
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
              <span className="w-16">
                {sec.id}
                {row}
              </span>
              {[...Array(mapConfig.seatsPerRow)].map((_, si) => {
                const seat = si + 1;
                const selected = isSeatSelected(sec.id, row, seat);
                return (
                  <button
                    disabled={maxReached && !selected}
                    key={seat}
                    className={`h-8 w-8 rounded transition 
                      ${selected ? "bg-green-500 text-white" : "bg-gray-200"}
                      ${maxReached && !selected ? "cursor-not-allowed opacity-50" : ""}`}
                    onClick={() =>
                      onSelect(sec.id, row, seat, sec.pricesByRow[row] ?? 0)
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
