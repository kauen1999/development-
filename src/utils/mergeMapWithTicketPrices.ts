import type { EventMapConfig } from "@/data/maps";

type TicketCategory = {
  title: string;
  price: number;
};

export function mergeMapWithTicketPrices(
  staticMap: EventMapConfig,
  categories: TicketCategory[]
): EventMapConfig {
  const sectors = staticMap.sectors.map((sector) => {
    const category = categories.find((c) => c.title === sector.name);
    const price = category?.price ?? 0;

    const pricesByRow: { [row: string]: number } = {};
    for (const row of sector.rows) {
      pricesByRow[row] = price;
    }

    return {
      ...sector,
      pricesByRow,
    };
  });

  return {
    ...staticMap,
    sectors,
  };
}
