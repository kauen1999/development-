import { useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/principal/header/Header";

// import react-qr-scanner dinamicamente (SSR off) com tipagem manual
const QrScanner = dynamic(() => import("react-qr-scanner"), {
  ssr: false,
}) as React.FC<{
  onScan?: (data: QrScannerResult) => void;
  onError?: (error: unknown) => void;
  style?: React.CSSProperties;
  constraints?: MediaStreamConstraints;
}>;

// Tipo do retorno do QrScanner
type QrScannerResult = string | { text: string } | null;

interface ValidationResult {
  status: string;
  usedAt: string;
  ticketId: string;
  qrId: string;
  eventName: string;
  userEmail: string;
}

// tipagem global para Safari
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export default function ScannerPage() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const playBeep = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const vibrate = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const handleScan = async (data: string | null) => {
    if (data && !loading) {
      setError(null);
      setResult(null);
      setLoading(true);

      try {
        // 🔑 Envia qrId para a API
        const res = await fetch("/api/tickets/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrId: data, device: "pwa-scanner" }),
        });

        const json: ValidationResult & { error?: string } = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Validation failed");
        }

        playBeep();
        vibrate();
        setResult(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = (err: unknown) => {
    console.error("QR Scanner error:", err);
    setError("Erro ao acessar a câmera. Tente novamente.");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header minimal */}
      <Header minimal />

      {/* Conteúdo principal */}
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">
          Validador de Tickets
        </h1>

        <div className="w-full max-w-md rounded-lg bg-white p-2 shadow">
          <QrScanner
            onScan={(res: QrScannerResult) => {
              if (!res) return;
              if (typeof res === "string") {
                handleScan(res);
              } else if ("text" in res && typeof res.text === "string") {
                handleScan(res.text);
              }
            }}
            onError={handleError}
            style={{ width: "100%" }}
            constraints={{ video: { facingMode: "environment" } }}
          />
        </div>

        {loading && <p className="mt-4 text-blue-600">Validando...</p>}

        {result && (
          <div className="mt-6 w-full max-w-md rounded-lg border bg-green-100 p-4 shadow">
            <h2 className="mb-2 text-lg font-bold text-green-700">
              ✅ Ticket válido
            </h2>
            <p>
              <strong>Evento:</strong> {result.eventName}
            </p>
            <p>
              <strong>Usuário:</strong> {result.userEmail}
            </p>
            <p>
              <strong>QR ID:</strong> {result.qrId}
            </p>
            <p>
              <strong>Validado em:</strong>{" "}
              {new Date(result.usedAt).toLocaleString()}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-6 w-full max-w-md rounded-lg border bg-red-100 p-4 shadow">
            <h2 className="mb-2 text-lg font-bold text-red-700">
              ❌ Ticket inválido
            </h2>
            <p>{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
