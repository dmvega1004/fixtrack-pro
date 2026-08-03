// La Barcode Detection API todavía no forma parte de lib.dom.d.ts de
// TypeScript (solo la implementa Chrome/Chromium de forma nativa). La
// declaramos a mano para poder usarla con `'BarcodeDetector' in window`.
interface BarcodeDetectorOptions {
  formats: string[];
}

interface DetectedBarcode {
  rawValue: string;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
