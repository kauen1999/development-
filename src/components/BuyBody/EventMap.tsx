// src/components/BuyBody/EventMap.tsx
import React, { useEffect, useState } from "react";

export type SeatConfig = {
  id: string;
  number: number;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  price: number;
};

export type RowConfig = {
  name: string;
  seats: SeatConfig[];
};

export type SectorConfig = {
  id: string;
  name: string;
  rows: RowConfig[];
};

export interface EventMapConfig {
  name: string;
  sectors: SectorConfig[];
}

type SelectedSeat = { sectorId: string; row: string; seat: number };

interface BaseProps {
  onSelect: (seatId: string, sectorName: string, row: string, seat: number, price: number) => void;
  selectedSeats: SelectedSeat[];
  maxReached: boolean;
  soldSeatsIndex?: ReadonlySet<string>; // contém seatId reais
}
type StaticProps = BaseProps & { mapConfig: EventMapConfig; sessionId?: undefined; loadMapConfig?: undefined };
type DynamicProps = BaseProps & { sessionId: string; loadMapConfig: (sessionId: string) => Promise<EventMapConfig | null>; mapConfig?: undefined };
type EventMapProps = StaticProps | DynamicProps;

export const EventMap: React.FC<EventMapProps> = (props) => {
  const { onSelect, selectedSeats, maxReached, soldSeatsIndex = new Set<string>() } = props;
  const isDynamic =
    typeof (props as DynamicProps).sessionId === "string" &&
    typeof (props as DynamicProps).loadMapConfig === "function";

  const [dynamicConfig, setDynamicConfig] = useState<EventMapConfig | null>(null);
  useEffect(() => {
    if (!isDynamic) return;
    let cancelled = false;
    const { sessionId, loadMapConfig } = props as DynamicProps;
    loadMapConfig(sessionId).then((cfg) => {
      if (!cancelled) setDynamicConfig(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, [isDynamic, props]);

  const mapConfig: EventMapConfig | undefined = isDynamic ? dynamicConfig ?? undefined : (props as StaticProps).mapConfig;
  if (!mapConfig) return <div className="text-sm text-gray-500">Mapa indisponible</div>;

  const isSelected = (sectorId: string, row: string, seat: number) =>
    selectedSeats.some((s) => s.sectorId === sectorId && s.row === row && s.seat === seat);

  const isSold = (seatId: string) => soldSeatsIndex.has(seatId);

  return (
    <div>
      <h2 className="font-bold">{mapConfig.name}</h2>
      {mapConfig.sectors.map((sec) => (
        <div key={sec.id} className="mb-4">
          <h3 className="font-semibold">{sec.name}</h3>
          {sec.rows.map((rowCfg) => (
            <div key={`${sec.id}-${rowCfg.name}`} className="flex gap-2 mb-2">
              <span className="w-8">{rowCfg.name}</span>
              <div className="flex flex-wrap gap-1">
                {rowCfg.seats.map((seat) => {
                  const selected = isSelected(sec.id, rowCfg.name, seat.number);
                  const sold = isSold(seat.id);
                  const disabled = sold || (maxReached && !selected);
                  return (
                    <button
                      key={seat.id}
                      disabled={disabled}
                      onClick={() => onSelect(seat.id, sec.name, rowCfg.name, seat.number, seat.price)}
                      className={`h-8 w-8 rounded text-sm ${
                        sold
                          ? "bg-gray-400 text-white"
                          : selected
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 hover:bg-blue-300"
                      }`}
                      title={`Fila ${rowCfg.name} - Asiento ${seat.number} (${seat.price} ARS)`}
                    >
                      {seat.number}
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
