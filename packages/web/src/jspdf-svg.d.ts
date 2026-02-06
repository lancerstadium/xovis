import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    svg(
      svg: SVGElement | string,
      options: {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    ): Promise<void>;
  }
}
