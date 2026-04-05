import { Injectable } from '@angular/core';
import cytoscape from 'cytoscape';
import jsPDF from 'jspdf';

export interface BuildExportImageParams {
  cy: cytoscape.Core;
  asSeen?: boolean;
  exportTight: boolean;
  exportPaddingPx: number;
  backgroundUrl: string;
  bgOffsetX: number;
  bgOffsetY: number;
  backgroundOpacity: string;
}

@Injectable({ providedIn: 'root' })
export class FamilyGraphExportService {
  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  parseBgAlpha(backgroundOpacity: string): number {
    const raw = Number(backgroundOpacity);
    if (!isFinite(raw)) return 1;
    const as01 = raw > 1 ? raw / 100 : raw;
    return Math.max(0, Math.min(1, as01));
  }

  drawBackground(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    bgImg: HTMLImageElement | null,
    bgOffsetX: number,
    bgOffsetY: number,
    backgroundOpacity: string
  ): void {
    if (!bgImg) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, cw, ch);
      return;
    }

    const bgRatio = bgImg.width / bgImg.height;
    const canvasRatio = cw / ch;
    let drawW = cw,
      drawH = ch,
      dx = 0,
      dy = 0;

    if (bgRatio > canvasRatio) {
      drawH = ch;
      drawW = bgImg.width * (ch / bgImg.height);
      dx = (cw - drawW) / 2;
    } else {
      drawW = cw;
      drawH = bgImg.height * (cw / bgImg.width);
      dy = (ch - drawH) / 2;
    }

    dx += bgOffsetX;
    dy += bgOffsetY;

    ctx.drawImage(bgImg, dx, dy, drawW, drawH);

    const alpha = this.parseBgAlpha(backgroundOpacity);
    const wash = 1 - alpha;

    if (wash > 0) {
      ctx.save();
      ctx.globalAlpha = wash;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  }

  async buildExportImage(
    params: BuildExportImageParams
  ): Promise<{ dataUrl: string; meta: { width: number; height: number } } | null> {
    const {
      cy,
      asSeen = true,
      exportTight,
      exportPaddingPx,
      backgroundUrl,
      bgOffsetX,
      bgOffsetY,
      backgroundOpacity,
    } = params;

    const dpr = window.devicePixelRatio || 2;
    const pxScale = dpr;

    const cyPngDataUrl = cy.png({
      full: !asSeen ? true : false,
      scale: pxScale,
      bg: 'transparent',
    });

    const [cyImg, bgImg] = await Promise.all([
      this.loadImage(cyPngDataUrl),
      this.loadImage(backgroundUrl).catch(() => null),
    ]);

    if (!exportTight) {
      const padPx = Math.max(0, Math.round(exportPaddingPx));
      const canvas = document.createElement('canvas');
      canvas.width = cyImg.width + padPx * 2;
      canvas.height = cyImg.height + padPx * 2;
      const ctx = canvas.getContext('2d')!;

      this.drawBackground(
        ctx,
        canvas.width,
        canvas.height,
        bgImg,
        bgOffsetX,
        bgOffsetY,
        backgroundOpacity
      );
      ctx.drawImage(cyImg, padPx, padPx);
      return {
        dataUrl: canvas.toDataURL('image/png'),
        meta: { width: canvas.width, height: canvas.height },
      };
    }

    const rb = cy.elements().renderedBoundingBox();
    const pad = exportPaddingPx;
    const labelGuard = 18;
    const totalPad = pad + labelGuard;

    const cropX = Math.max((rb.x1 - totalPad) * pxScale, 0);
    const cropY = Math.max((rb.y1 - totalPad) * pxScale, 0);
    const cropW = Math.min(
      (rb.x2 - rb.x1 + totalPad * 2) * pxScale,
      cyImg.width - cropX
    );
    const cropH = Math.min(
      (rb.y2 - rb.y1 + totalPad * 2) * pxScale,
      cyImg.height - cropY
    );

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cropW));
    canvas.height = Math.max(1, Math.round(cropH));
    const ctx = canvas.getContext('2d')!;

    this.drawBackground(
      ctx,
      canvas.width,
      canvas.height,
      bgImg,
      bgOffsetX,
      bgOffsetY,
      backgroundOpacity
    );

    ctx.drawImage(
      cyImg,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return {
      dataUrl: canvas.toDataURL('image/png'),
      meta: { width: canvas.width, height: canvas.height },
    };
  }

  downloadPng(dataUrl: string): void {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'family-tree.png';
    a.click();
  }

  downloadPdf(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const w = img.width,
        h = img.height;
      const pdf = new jsPDF({
        unit: 'px',
        format: [w, h],
        orientation: w >= h ? 'l' : 'p',
        compress: true,
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, w, h, undefined, 'FAST');
      pdf.save('family-tree.pdf');
    };
    img.src = dataUrl;
  }
}
