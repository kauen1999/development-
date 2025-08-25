// src/components/maps/BelgranoMap.tsx
import React from "react";

type Seat = {
  id: string;
  label: string; // "A1", "A2"
  status: "AVAILABLE" | "RESERVED" | "SOLD";
  ticketCategory: { id: string; name: string; price: number };
};

interface Props {
  seats: Seat[];
}

const BelgranoMap: React.FC<Props> = ({ seats }) => {
  // Agrupa por categoria
  const categories = seats.reduce((acc, seat) => {
    const cat = seat.ticketCategory.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  return (
    <div className="flex flex-col gap-8 items-center w-full">
      {Object.entries(categories).map(([category, list]) => {
        // ordena por número
        const ordered = list.sort(
          (a, b) =>
            parseInt(a.label.replace(/\D/g, ""), 10) -
            parseInt(b.label.replace(/\D/g, ""), 10)
        );

        // fatia em grupos de 10
        const rows: Seat[][] = [];
        for (let i = 0; i < ordered.length; i += 10) {
          rows.push(ordered.slice(i, i + 10));
        }

        return (
          <div key={category} className="text-center">
            <h2 className="text-xl font-bold mb-3">{category}</h2>
            <div className="flex flex-col gap-2 items-center">
              {rows.map((row, idx) => (
                <div key={idx} className="flex gap-2">
                  {row.map(seat => (
                    <div
                      key={seat.id}
                      className={`w-10 h-10 flex items-center justify-center border rounded
                        ${
                          seat.status === "AVAILABLE"
                            ? "bg-green-100"
                            : seat.status === "RESERVED"
                            ? "bg-yellow-100"
                            : "bg-red-200"
                        }`}
                    >
                      {seat.label}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BelgranoMap;
