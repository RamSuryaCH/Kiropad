declare module 'qrcode-generator' {
  interface QRCode {
    addData(data: string): void;
    make(): void;
    createDataURL(cellSize?: number, margin?: number): string;
    createSvgTag(cellSize?: number, margin?: number): string;
  }
  function qrcode(typeNumber: number, errorCorrection: string): QRCode;
  export = qrcode;
}
