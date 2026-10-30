import fs from 'fs';
import path from 'path';

export interface GlyphItem {
  fontKey: '/F1' | '/F2' | '/F3';
  gid: number;
  code: number;
  unicodeHex: string;
  unicodeChar: string;
  widthPt: number;
}

export class PdfShapingEngine {
  private static latinBuf: Buffer;
  private static kannadaBuf: Buffer;
  private static devanagariBuf: Buffer;

  private static latinCmap: (c: number) => number;
  private static kannadaCmap: (c: number) => number;
  private static devanagariCmap: (c: number) => number;

  private static latinWidths: number[];
  private static kannadaWidths: number[];
  private static devanagariWidths: number[];

  private static initialized = false;

  static initialize() {
    if (this.initialized) return;

    const fontDir = path.resolve(process.cwd(), 'server', 'assets', 'fonts');
    this.latinBuf = fs.readFileSync(path.join(fontDir, 'NotoSans-Regular.ttf'));
    this.kannadaBuf = fs.readFileSync(path.join(fontDir, 'NotoSansKannada-Regular.ttf'));
    this.devanagariBuf = fs.readFileSync(path.join(fontDir, 'NotoSansDevanagari-Regular.ttf'));

    this.latinCmap = this.parseCmapFormat4(this.latinBuf);
    this.kannadaCmap = this.parseCmapFormat4(this.kannadaBuf);
    this.devanagariCmap = this.parseCmapFormat4(this.devanagariBuf);

    this.latinWidths = this.parseHmtx(this.latinBuf);
    this.kannadaWidths = this.parseHmtx(this.kannadaBuf);
    this.devanagariWidths = this.parseHmtx(this.devanagariBuf);

    this.initialized = true;
  }

  static getFontBuffers() {
    this.initialize();
    return {
      latin: this.latinBuf,
      kannada: this.kannadaBuf,
      devanagari: this.devanagariBuf
    };
  }

  private static parseCmapFormat4(buf: Buffer): (code: number) => number {
    const numTables = buf.readUInt16BE(4);
    let cmapOffset = 0;
    for (let i = 0; i < numTables; i++) {
      if (buf.toString('utf8', 12 + i * 16, 16 + i * 16) === 'cmap') {
        cmapOffset = buf.readUInt32BE(12 + i * 16 + 8);
        break;
      }
    }
    if (!cmapOffset) return (code: number) => code;

    const numSubtables = buf.readUInt16BE(cmapOffset + 2);
    let subOffset = 0;
    for (let i = 0; i < numSubtables; i++) {
      const off = cmapOffset + buf.readUInt32BE(cmapOffset + 4 + i * 8 + 4);
      if (buf.readUInt16BE(off) === 4) {
        subOffset = off;
        break;
      }
    }
    if (!subOffset) return (code: number) => code;

    const segCount = buf.readUInt16BE(subOffset + 6) / 2;
    const endCodes: number[] = [];
    for (let i = 0; i < segCount; i++) endCodes.push(buf.readUInt16BE(subOffset + 14 + i * 2));
    const startCodesOffset = subOffset + 16 + segCount * 2;
    const startCodes: number[] = [];
    for (let i = 0; i < segCount; i++) startCodes.push(buf.readUInt16BE(startCodesOffset + i * 2));
    const idDeltasOffset = startCodesOffset + segCount * 2;
    const idDeltas: number[] = [];
    for (let i = 0; i < segCount; i++) idDeltas.push(buf.readInt16BE(idDeltasOffset + i * 2));
    const idRangeOffsetsOffset = idDeltasOffset + segCount * 2;
    const idRangeOffsets: number[] = [];
    for (let i = 0; i < segCount; i++) idRangeOffsets.push(buf.readUInt16BE(idRangeOffsetsOffset + i * 2));

    return (charCode: number): number => {
      for (let i = 0; i < segCount; i++) {
        if (endCodes[i] >= charCode && startCodes[i] <= charCode) {
          if (idRangeOffsets[i] === 0) {
            return (charCode + idDeltas[i]) & 0xFFFF;
          } else {
            const roOffset = idRangeOffsetsOffset + i * 2;
            const glyphOffset = roOffset + idRangeOffsets[i] + (charCode - startCodes[i]) * 2;
            const gid = buf.readUInt16BE(glyphOffset);
            return gid !== 0 ? ((gid + idDeltas[i]) & 0xFFFF) : 0;
          }
        }
      }
      return 0;
    };
  }

  private static parseHmtx(buf: Buffer): number[] {
    const numTables = buf.readUInt16BE(4);
    const tables: Record<string, number> = {};
    for (let i = 0; i < numTables; i++) {
      tables[buf.toString('utf8', 12 + i * 16, 16 + i * 16)] = buf.readUInt32BE(12 + i * 16 + 8);
    }
    const hheaOff = tables['hhea'];
    const hmtxOff = tables['hmtx'];
    const numHMetrics = buf.readUInt16BE(hheaOff + 34);

    const widths: number[] = [];
    for (let i = 0; i < numHMetrics; i++) {
      widths.push(buf.readUInt16BE(hmtxOff + i * 4));
    }
    return widths;
  }

  static getGlyphWidth(fontKey: '/F1' | '/F2' | '/F3', gid: number, fontSize: number): number {
    this.initialize();
    const arr = fontKey === '/F1' ? this.latinWidths : (fontKey === '/F2' ? this.kannadaWidths : this.devanagariWidths);
    const raw = (gid < arr.length ? arr[gid] : (arr[arr.length - 1] || 600));
    return (raw / 1000) * fontSize;
  }

  /**
   * Complex Script Shaping Engine:
   * Shapes Kannada and Devanagari text into typographic glyph clusters,
   * handling conjuncts, below-base forms (ottu), half-forms, and matra reordering.
   */
  static shapeText(text: string, fontSize: number): GlyphItem[] {
    this.initialize();
    const result: GlyphItem[] = [];
    const len = text.length;
    let i = 0;

    while (i < len) {
      const ch = text[i];
      const code = ch.charCodeAt(0);

      // 1. Kannada Script (U+0C80 - U+0CFF)
      if (code >= 0x0C80 && code <= 0x0CFF) {
        // Check for conjunct: Consonant + Virama (\u0CCD) + Consonant
        if (
          code >= 0x0C95 && code <= 0x0CB9 &&
          i + 2 < len &&
          text.charCodeAt(i + 1) === 0x0CCD &&
          text.charCodeAt(i + 2) >= 0x0C95 && text.charCodeAt(i + 2) <= 0x0CB9
        ) {
          const c1 = ch;
          const c2 = text[i + 2];
          const c2Code = c2.charCodeAt(0);

          // Base consonant
          const baseGid = this.kannadaCmap(code);
          result.push({
            fontKey: '/F2',
            gid: baseGid,
            code: code,
            unicodeHex: code.toString(16).padStart(4, '0'),
            unicodeChar: c1,
            widthPt: this.getGlyphWidth('/F2', baseGid, fontSize)
          });

          // Subjoined below-base consonant (ottu)
          const subscriptGid = (c2Code - 0x0C95) + 96;
          result.push({
            fontKey: '/F2',
            gid: subscriptGid,
            code: c2Code,
            unicodeHex: '0ccd' + c2Code.toString(16).padStart(4, '0'),
            unicodeChar: c2,
            widthPt: this.getGlyphWidth('/F2', subscriptGid, fontSize)
          });

          i += 3;
          continue;
        }

        // Check for final consonant with virama: Consonant + \u0CCD
        if (
          code >= 0x0C95 && code <= 0x0CB9 &&
          i + 1 < len &&
          text.charCodeAt(i + 1) === 0x0CCD
        ) {
          const viramaGid = (code - 0x0C95) + 168;
          result.push({
            fontKey: '/F2',
            gid: viramaGid,
            code: code,
            unicodeHex: code.toString(16).padStart(4, '0') + '0ccd',
            unicodeChar: ch + text[i + 1],
            widthPt: this.getGlyphWidth('/F2', viramaGid, fontSize)
          });
          i += 2;
          continue;
        }

        // Standard Kannada character
        const gid = this.kannadaCmap(code);
        result.push({
          fontKey: '/F2',
          gid: gid,
          code: code,
          unicodeHex: code.toString(16).padStart(4, '0'),
          unicodeChar: ch,
          widthPt: this.getGlyphWidth('/F2', gid, fontSize)
        });
        i++;
        continue;
      }

      // 2. Devanagari / Hindi Script (U+0900 - U+097F)
      if (code >= 0x0900 && code <= 0x097F) {
        // Reorder short i (\u093F): if consonant precedes \u093F, render \u093F before the consonant visually
        if (
          code >= 0x0915 && code <= 0x0939 &&
          i + 1 < len &&
          text.charCodeAt(i + 1) === 0x093F
        ) {
          const shortIGid = this.devanagariCmap(0x093F);
          result.push({
            fontKey: '/F3',
            gid: shortIGid,
            code: 0x093F,
            unicodeHex: '093f',
            unicodeChar: '\u093F',
            widthPt: this.getGlyphWidth('/F3', shortIGid, fontSize)
          });

          const baseGid = this.devanagariCmap(code);
          result.push({
            fontKey: '/F3',
            gid: baseGid,
            code: code,
            unicodeHex: code.toString(16).padStart(4, '0'),
            unicodeChar: ch,
            widthPt: this.getGlyphWidth('/F3', baseGid, fontSize)
          });

          i += 2;
          continue;
        }

        // Half-form conjunct: Consonant + Virama (\u094D) + Consonant
        if (
          code >= 0x0915 && code <= 0x0939 &&
          i + 2 < len &&
          text.charCodeAt(i + 1) === 0x094D &&
          text.charCodeAt(i + 2) >= 0x0915 && text.charCodeAt(i + 2) <= 0x0939
        ) {
          let halfGid = (code - 0x0915) + 183;
          if (code === 0x0924 && text.charCodeAt(i + 2) === 0x0924) {
            halfGid = 522; // tataprehalfdeva
          } else if (code === 0x0915 && text.charCodeAt(i + 2) === 0x0937) {
            halfGid = 219; // kassa
          } else if (code === 0x091C && text.charCodeAt(i + 2) === 0x091E) {
            halfGid = 220; // janya
          }

          result.push({
            fontKey: '/F3',
            gid: halfGid,
            code: code,
            unicodeHex: code.toString(16).padStart(4, '0') + '094d',
            unicodeChar: ch,
            widthPt: this.getGlyphWidth('/F3', halfGid, fontSize)
          });

          // Second consonant
          const c2 = text[i + 2];
          const c2Code = c2.charCodeAt(0);
          const c2Gid = this.devanagariCmap(c2Code);
          result.push({
            fontKey: '/F3',
            gid: c2Gid,
            code: c2Code,
            unicodeHex: c2Code.toString(16).padStart(4, '0'),
            unicodeChar: c2,
            widthPt: this.getGlyphWidth('/F3', c2Gid, fontSize)
          });

          i += 3;
          continue;
        }

        // Standard Devanagari character
        const gid = this.devanagariCmap(code);
        result.push({
          fontKey: '/F3',
          gid: gid,
          code: code,
          unicodeHex: code.toString(16).padStart(4, '0'),
          unicodeChar: ch,
          widthPt: this.getGlyphWidth('/F3', gid, fontSize)
        });
        i++;
        continue;
      }

      // 3. Latin, Math, ASCII, Numbers & Symbols
      const gid = this.latinCmap(code);
      result.push({
        fontKey: '/F1',
        gid: gid,
        code: code,
        unicodeHex: code.toString(16).padStart(4, '0'),
        unicodeChar: ch,
        widthPt: this.getGlyphWidth('/F1', gid, fontSize)
      });
      i++;
    }

    return result;
  }

  /**
   * True Font-Width Line Layout Engine:
   * Wraps paragraphs according to the exact point width of the shaped glyphs,
   * completely eliminating character-count estimates and line overflows.
   */
  static wrapTextByFontWidth(text: string, fontSize: number, maxLineWidthPt = 495): GlyphItem[][] {
    if (!text) return [];
    const lines: GlyphItem[][] = [];
    const paragraphs = text.split(/\r?\n/);

    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const shapedGlyphs = this.shapeText(para, fontSize);

      // Split into words by whitespace glyphs
      const words: GlyphItem[][] = [];
      let currentWord: GlyphItem[] = [];

      for (const g of shapedGlyphs) {
        if (g.code === 32) {
          if (currentWord.length > 0) {
            words.push(currentWord);
            currentWord = [];
          }
          words.push([g]); // space as separate token
        } else {
          currentWord.push(g);
        }
      }
      if (currentWord.length > 0) {
        words.push(currentWord);
      }

      let currentLine: GlyphItem[] = [];
      let currentLineWidth = 0;

      for (const w of words) {
        const wordWidth = w.reduce((acc, g) => acc + g.widthPt, 0);

        // If single word exceeds maxLineWidthPt, break it character-by-character
        if (wordWidth > maxLineWidthPt) {
          if (currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = [];
            currentLineWidth = 0;
          }
          for (const g of w) {
            if (currentLineWidth + g.widthPt > maxLineWidthPt && currentLine.length > 0) {
              lines.push(currentLine);
              currentLine = [];
              currentLineWidth = 0;
            }
            currentLine.push(g);
            currentLineWidth += g.widthPt;
          }
          continue;
        }

        if (currentLineWidth + wordWidth > maxLineWidthPt && currentLine.length > 0) {
          lines.push(currentLine);
          // If the previous line ended with space or next starts with space, trim leading space
          if (w.length === 1 && w[0].code === 32) {
            currentLine = [];
            currentLineWidth = 0;
            continue;
          }
          currentLine = [...w];
          currentLineWidth = wordWidth;
        } else {
          currentLine.push(...w);
          currentLineWidth += wordWidth;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * Generates PDF font-switched text operators for a line of shaped glyphs:
   * e.g. "/F1 12 Tf <0024> Tj /F2 12 Tf <0060> Tj"
   */
  static encodeLineToPdfOps(glyphs: GlyphItem[], fontSize: number, usedGidMap: {
    f1: Map<number, string>;
    f2: Map<number, string>;
    f3: Map<number, string>;
  }): string {
    let result = '';
    let currentFont = '';
    let currentHex = '';

    const flush = () => {
      if (currentHex && currentFont) {
        result += `${currentFont} ${fontSize} Tf <${currentHex}> Tj `;
        currentHex = '';
      }
    };

    for (const g of glyphs) {
      const uHex = g.unicodeHex || g.code.toString(16).padStart(4, '0');
      if (g.fontKey === '/F1') usedGidMap.f1.set(g.gid, uHex);
      else if (g.fontKey === '/F2') usedGidMap.f2.set(g.gid, uHex);
      else if (g.fontKey === '/F3') usedGidMap.f3.set(g.gid, uHex);

      const gidHex = (g.gid || 0).toString(16).padStart(4, '0');
      if (g.fontKey !== currentFont) {
        flush();
        currentFont = g.fontKey;
      }
      currentHex += gidHex;
    }
    flush();
    return result.trim();
  }

  /**
   * Constructs standard Adobe UCS-2 ToUnicode CMap mapping all used GIDs back to original Unicode codepoints
   */
  static buildToUnicodeCMap(usedMap: Map<number, string>): string {
    const lines: string[] = [];
    for (const [gid, uHex] of usedMap.entries()) {
      lines.push(`<${gid.toString(16).padStart(4, '0')}> <${uHex}>`);
    }
    let bfBlocks = '';
    for (let i = 0; i < lines.length; i += 100) {
      const chunk = lines.slice(i, i + 100);
      bfBlocks += `${chunk.length} beginbfchar\n${chunk.join('\n')}\nendbfchar\n`;
    }
    return `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Custom-ToUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${bfBlocks}endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  }
}
