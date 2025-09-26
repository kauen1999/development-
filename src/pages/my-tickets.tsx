// src/pages/my-tickets.tsx
import { trpc } from "@/utils/trpc";

export default function MyTicketsPage() {
  const { data: tickets, isLoading } = trpc.ticket.listMyTickets.useQuery();

  if (isLoading) return <p>Carregando tickets...</p>;
  if (!tickets || tickets.length === 0) return <p>Você não possui tickets.</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Meus Tickets</h1>
      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="border p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold">{ticket.event.name}</h2>
            <p>
              Data:{" "}
              {ticket.eventSession?.dateTimeStart
                ? new Date(ticket.eventSession.dateTimeStart).toLocaleString()
                : "—"}
            </p>
            <p>Assento: {ticket.seat?.labelFull ?? "Geral"}</p>
            <p>
              Status:{" "}
              {ticket.usedAt ? "✅ Validado" : "⌛ Não validado"}
            </p>
            {ticket.pdfUrl && (
              <a
                href={ticket.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                📄 Ver PDF
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
