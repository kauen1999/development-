// src/types/react-qr-scanner.d.ts
declare module "react-qr-scanner" {
  import type * as React from "react";

  export interface QrScannerProps {
    onScan?: (data: string | null) => void;
    onError?: (error: unknown) => void;
    style?: React.CSSProperties;
    constraints?: MediaStreamConstraints;
  }

  const QrScanner: React.FC<QrScannerProps>;
  export default QrScanner;
}
