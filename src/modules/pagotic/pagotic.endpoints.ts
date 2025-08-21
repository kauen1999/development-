// Centralize PagoTIC endpoints to avoid string literals scattered across the code.
export const PAGOTIC_ENDPOINTS = {
  authToken: "/auth/realms/entidades/protocol/openid-connect/token",
  pagos: "/pagos",
  pagosById: (id: string) => `/pagos/${encodeURIComponent(id)}`,
  pagosCancelar: (id: string) => `/pagos/cancelar/${encodeURIComponent(id)}`,
  pagosDevolucion: (id: string) => `/pagos/devolucion/${encodeURIComponent(id)}`,
  pagosAgrupar: "/pagos/agrupar",
  pagosDesagrupar: "/pagos/cancelar-agrupacion", // some spaces document "Cancelar agrupación"
  pagosDistribucion: "/pagos/distribucion", // distribution per payment (see docs)
  importacionesPagosCsv: "/importaciones/pagos", // base pública endpoints live under /importaciones/*
  importacionesPagosDetalles: (importId: string) =>
    `/importaciones/pagos/${encodeURIComponent(importId)}/detalles`,
  resendNotification: "/notificaciones/reintentar", // when available
} as const;
