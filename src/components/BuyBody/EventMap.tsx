// src/components/BuyBody/EventMap.tsx
import React from "react";

type RowConfig = {
  name: string;          // ex: "A"
  seatNumbers: number[]; // deduplicado e ordenado
  price: number;
};

type SectorConfig = {
  id: string;            // ticketCategoryId (identidade real)
  name: string;          // exibição, ex: "Platea A"
  rows: RowConfig[];
};

export interface EventMapConfig {
  name: string;
  sectors: SectorConfig[];
}

interface EventMapProps {
  mapConfig: EventMapConfig;
  onSelect: (
    sectorId: string,
    sectorName: string,
    row: string,
    seat: number,
    price: number
  ) => void;
  selectedSeats: { sectorId: string; row: string; seat: number }[];
  maxReached: boolean;
  /**
   * Índice (Set) de assentos indisponíveis na forma "sectorId|ROW|number"
   * Use ReadonlySet para evitar mutações acidentais.
   */
  soldSeatsIndex?: ReadonlySet<string>;
}

// 🔒 Singleton imutável para default (evita new Set() a cada render)
const EMPTY_SET: ReadonlySet<string> = new Set();

export const EventMap: React.FC<EventMapProps> = ({
  mapConfig,
  onSelect,
  selectedSeats,
  maxReached,
  soldSeatsIndex = EMPTY_SET,
}) => {
  const isSelected = (sectorId: string, row: string, seat: number) =>
    selectedSeats.some((s) => s.sectorId === sectorId && s.row === row && s.seat === seat);

  const isSoldOrBlocked = (sectorId: string, row: string, seat: number) =>
    soldSeatsIndex.has(`${sectorId}|${row}|${seat}`);

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold">{mapConfig.name}</h2>

      {mapConfig.sectors.map((sec) => (
        <div key={sec.id} className="mb-6">
          <h3 className="mb-2 font-semibold">{sec.name}</h3>

          {sec.rows.map((rowCfg) => (
            <div key={`${sec.id}-${rowCfg.name}`} className="mb-2 flex items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {rowCfg.seatNumbers.map((seatNumber) => {
                  const selected = isSelected(sec.id, rowCfg.name, seatNumber);
                  const blocked = isSoldOrBlocked(sec.id, rowCfg.name, seatNumber);
                  const price = rowCfg.price;
                  const isDisabled = blocked || price <= 0 || (maxReached && !selected);

                  return (
                    <button
                      key={`${sec.id}-${rowCfg.name}-${seatNumber}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => onSelect(sec.id, sec.name, rowCfg.name, seatNumber, price)}
                      aria-pressed={selected}
                      aria-label={
                        blocked
                          ? `Assento indisponível`
                          : `Setor ${sec.name}, fila ${rowCfg.name}, assento ${seatNumber}, preço ${price}`
                      }
                      data-sector-id={sec.id}
                      data-sector-name={sec.name}
                      data-row={rowCfg.name}
                      data-seat={seatNumber}
                      className={`h-8 w-8 rounded text-sm transition
                        ${
                          isDisabled
                            ? "cursor-not-allowed bg-gray-400 text-white"
                            : selected
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 hover:bg-blue-300"
                        }
                        ${maxReached && !selected ? "opacity-50" : ""}`}
                      title={
                        blocked
                          ? `Indisponível`
                          : `Setor ${sec.name}, fila ${rowCfg.name}, assento ${seatNumber}`
                      }
                    >
                      {seatNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
