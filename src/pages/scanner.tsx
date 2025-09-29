import { useState } from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import Header from "@/components/principal/header/Header";
import Footer from "@/components/principal/footer/Footer";
import { MdQrCode, MdCheckCircle, MdError, MdRefresh, MdCameraAlt } from "react-icons/md";

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

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Validation failed");
        }

        //  Normaliza o resultado antes de salvar
        setResult({
          status: String(json.status),
          usedAt: String(json.usedAt),
          ticketId: String(json.ticketId ?? ""),
          qrId: String(json.qrId),
          eventName: String(json.eventName), 
          userEmail: String(json.userEmail),  
        });
        playBeep();
        vibrate();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = (err: unknown) => {
    console.error("QR Scanner error:", err);
    setError("Error al acceder a la cámara. Intentá de nuevo.");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Validador de Entradas - EntradaMaster</title>
        <meta name="robots" content="noindex" />
      </Head>
      
      <Header minimal />
      
      <main className="flex-1 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header da página */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-100">
              <MdQrCode className="text-4xl text-white" />
            </div>
            <h1 className="mb-4 text-3xl md:text-4xl font-bold text-gray-900">
              Validador de Entradas
            </h1>
            <p className="text-base md:text-lg text-gray-600">
              Escaneá el código QR de la entrada para validar
            </p>
          </div>

          <div className="space-y-6">
            {/* Scanner */}
            <div className="rounded-xl bg-white p-4 md:p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <MdCameraAlt className="text-2xl text-primary-100" />
                <h2 className="text-lg font-semibold text-gray-800">Escáner de Código QR</h2>
              </div>
              
              <div className="rounded-lg overflow-hidden bg-gray-100">
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
            </div>

            {/* Loading state */}
            {loading && (
              <div className="rounded-lg bg-blue-50 p-6 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-100 border-t-transparent"></div>
                <h3 className="mb-2 text-lg font-semibold text-blue-700">Validando entrada...</h3>
                <p className="text-sm text-blue-600">Esperá mientras procesamos la validación</p>
              </div>
            )}

            {/* Resultado válido */}
            {result && (
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-2">
                  <MdCheckCircle className="text-3xl text-green-500" />
                  <h2 className="text-xl font-semibold text-green-700">Entrada Válida</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="font-medium text-gray-600">Evento:</span>
                    <span className="text-gray-900 font-semibold">{result.eventName}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="font-medium text-gray-600">Usuario:</span>
                    <span className="text-gray-900">{result.userEmail}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="font-medium text-gray-600">ID QR:</span>
                    <span className="font-mono text-sm text-gray-900 break-all">{result.qrId}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between">
                    <span className="font-medium text-gray-600">Validado:</span>
                    <span className="text-gray-900">{new Date(result.usedAt).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-100 px-6 py-3 font-semibold text-white transition-all hover:bg-orange-600 hover:shadow-lg"
                  >
                    <MdRefresh className="text-xl" />
                    Validar Otra Entrada
                  </button>
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center gap-2">
                  <MdError className="text-3xl text-red-500" />
                  <h2 className="text-xl font-semibold text-red-700">Entrada Inválida</h2>
                </div>
                
                <div className="mb-6 rounded-lg bg-red-50 p-4">
                  <p className="text-red-700">{error}</p>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setResult(null);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-all hover:bg-red-700 hover:shadow-lg"
                  >
                    <MdRefresh className="text-xl" />
                    Intentar de Nuevo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
