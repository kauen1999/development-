// src/moduls/pagotic/pagotic.endpoints.ts
export const PAGOTIC_ENDPOINTS = {
  authToken: "/auth/realms/entidades/protocol/openid-connect/token",
  pagos: "/pagos",
  pagosById: (id: string) => `/pagos/${encodeURIComponent(id)}`,
  pagosCancelar: (id: string) => `/pagos/cancelar/${encodeURIComponent(id)}`,
  pagosDevolucion: (id: string) => `/pagos/devolucion/${encodeURIComponent(id)}`,
  pagosAgrupar: "/pagos/agrupar",
  pagosDesagrupar: "/pagos/cancelar-agrupacion",
  pagosDistribucion: "/pagos/distribucion",
  importacionesPagosCsv: "/importaciones/pagos",
  importacionesPagosDetalles: (importId: string) =>
    `/importaciones/pagos/${encodeURIComponent(importId)}/detalles`,
  resendNotification: "/notificaciones/reintentar",
} as const;
