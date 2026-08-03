export const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/** Builds the A-D or A-E option letters for an exam's chosen number of alternatives. */
export function optionsForCount(optionsCount: 4 | 5): string[] {
  return DEFAULT_OPTIONS.slice(0, optionsCount);
}

/** A4 width in mm, used only as the reference for width-relative absolute measurements below. */
const SHEET_WIDTH_MM = 210;

const CORNER_INSET_PCT = 0.04;
/** Larger fiducials (~8–10 mm on A4-width print) improve phone detection vs keyboard/QR noise. */
const CORNER_MARK_SIZE_PCT = 0.05;
// All of the constants below are expressed as a fraction of the sheet's WIDTH (not height) —
// the sheet's height is derived from actual content (header + however many rows fit), instead of
// assuming a fixed A4 height and hoping the content matches it.
/** Identity block only (title / class / code / QR) — no ArUco here. */
const HEADER_HEIGHT_W = 0.125;
/** Clear air between header divider and the top of the OMR frame marks. */
const HEADER_OMR_GAP_W = 0.028;
/** Extra air so option letters above bubbles don't collide with the previous row / ArUco. */
const GRID_TOP_GAP_W = 0.028;
const ROW_HEIGHT_W = 0.09;
const COLUMN_GAP_W = 0.04;
const LABEL_WIDTH_RATIO = 0.09;
const BUBBLE_PITCH_FACTOR = 2.2;
const BUBBLE_HEIGHT_RATIO = 0.85;
const ROW_LEFT_PADDING_RATIO = 0.02;
const MAX_ROWS_PER_COLUMN = 25;
/** Band reserved above the grid for the big printed column letters (A B C D E) — print-only,
 * never sampled by the OMR reader (which only ever looks at `corners` and `bubbles`). */
const COLUMN_LABEL_HEIGHT_W = 0.032;

export type Point = { xPct: number; yPct: number };

export type BubblePosition = {
  question: number; // 1-indexed
  option: string;
  center: Point;
};

export type QuestionRow = {
  question: number;
  labelCenter: Point;
  options: BubblePosition[];
  /** Full-width band behind the row (column bounds x row height), for the alternating stripe background. */
  band: { xPct: number; yPct: number; widthPct: number; heightPct: number };
};

/** Big printed column letter (A/B/C/D/E) above each column — print-only, not used for reading. */
export type ColumnHeaderLabel = {
  column: number;
  option: string;
  center: Point;
};

export type GabaritoLayout = {
  questionCount: number;
  options: string[];
  aspectRatio: number;
  /** Bottom of the identity header as a fraction of sheet height (title/QR live above this). */
  headerHeightPct: number;
  cornerMarkSizePct: number;
  /**
   * ArUco centers framing the OMR block only (below the header). Shared by print + scanner.
   */
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  };
  bubbleRadiusPct: number;
  rows: QuestionRow[];
  bubbles: BubblePosition[];
  /** Vertical center (as a fraction of sheet height) of the printed column-letter band. */
  columnHeaderYPct: number;
  columnHeaders: ColumnHeaderLabel[];
};

/**
 * Pure percentage-based geometry for a gabarito sheet (0..1 relative to the sheet's own
 * width/height). Shared by the export renderer (GabaritoSheet) and the camera scanner
 * so both agree on exactly where every bubble and corner marker is.
 *
 * Vertical zones:
 *   1) Header (title, code, QR) — no fiducials
 *   2) Gap
 *   3) OMR frame — four ArUco marks + bubble grid inside
 */
export function buildGabaritoLayout(questionCount: number, options: string[] = DEFAULT_OPTIONS): GabaritoLayout {
  const columns = questionCount > MAX_ROWS_PER_COLUMN ? 2 : 1;
  const rowsPerColumn = Math.ceil(questionCount / columns);
  const columnWidthW = (1 - 2 * CORNER_INSET_PCT - (columns - 1) * COLUMN_GAP_W) / columns;
  const labelWidthW = columnWidthW * LABEL_WIDTH_RATIO;

  const maxDiameterFromWidthW = (columnWidthW - labelWidthW) / ((options.length - 1) * BUBBLE_PITCH_FACTOR + 1);
  const bubbleDiameterW = Math.min(ROW_HEIGHT_W * BUBBLE_HEIGHT_RATIO, maxDiameterFromWidthW);
  const bubbleRadiusW = bubbleDiameterW / 2;
  const bubblePitchW = bubbleDiameterW * BUBBLE_PITCH_FACTOR;
  const markHalfW = CORNER_MARK_SIZE_PCT / 2;

  // Top ArUco centers sit fully below the header so title/QR never overlap the marks.
  const topCornerW = HEADER_HEIGHT_W + HEADER_OMR_GAP_W + markHalfW;
  const columnHeaderTopW = topCornerW + markHalfW + GRID_TOP_GAP_W;
  const columnHeaderCenterW = columnHeaderTopW + COLUMN_LABEL_HEIGHT_W / 2;
  const gridTopW = columnHeaderTopW + COLUMN_LABEL_HEIGHT_W;
  const gridHeightW = rowsPerColumn * ROW_HEIGHT_W;
  const bottomCornerW = gridTopW + gridHeightW + GRID_TOP_GAP_W + markHalfW;
  const totalHeightW = bottomCornerW + markHalfW + HEADER_OMR_GAP_W;
  const aspectRatio = 1 / totalHeightW;

  const toYPct = (valueW: number) => valueW / totalHeightW;

  // Shared by both the per-row bubbles and the column-header letters, so both always agree
  // on exactly which x each option letter/bubble sits at within a column.
  const optionsAreaLeftForColumn = (columnIndex: number) => {
    const columnLeft = CORNER_INSET_PCT + columnIndex * (columnWidthW + COLUMN_GAP_W);
    const groupLeft = columnLeft + columnWidthW * ROW_LEFT_PADDING_RATIO;
    return { columnLeft, groupLeft, optionsAreaLeft: groupLeft + labelWidthW };
  };

  const columnHeaders: ColumnHeaderLabel[] = [];
  for (let col = 0; col < columns; col++) {
    const { optionsAreaLeft } = optionsAreaLeftForColumn(col);
    options.forEach((option, i) => {
      columnHeaders.push({
        column: col,
        option,
        center: {
          xPct: optionsAreaLeft + bubbleRadiusW + i * bubblePitchW,
          yPct: toYPct(columnHeaderCenterW),
        },
      });
    });
  }

  const rows: QuestionRow[] = [];
  for (let q = 1; q <= questionCount; q++) {
    const columnIndex = Math.floor((q - 1) / rowsPerColumn);
    const rowIndex = (q - 1) % rowsPerColumn;
    const rowCenterW = gridTopW + rowIndex * ROW_HEIGHT_W + ROW_HEIGHT_W / 2;
    const { columnLeft, groupLeft, optionsAreaLeft } = optionsAreaLeftForColumn(columnIndex);

    const rowOptions: BubblePosition[] = options.map((option, i) => ({
      question: q,
      option,
      center: {
        xPct: optionsAreaLeft + bubbleRadiusW + i * bubblePitchW,
        yPct: toYPct(rowCenterW),
      },
    }));

    rows.push({
      question: q,
      labelCenter: { xPct: groupLeft + labelWidthW * 0.4, yPct: toYPct(rowCenterW) },
      options: rowOptions,
      band: {
        xPct: columnLeft,
        yPct: toYPct(rowCenterW - ROW_HEIGHT_W / 2),
        widthPct: columnWidthW,
        heightPct: toYPct(ROW_HEIGHT_W),
      },
    });
  }

  return {
    questionCount,
    options,
    aspectRatio,
    headerHeightPct: toYPct(HEADER_HEIGHT_W),
    cornerMarkSizePct: CORNER_MARK_SIZE_PCT,
    corners: {
      topLeft: { xPct: CORNER_INSET_PCT, yPct: toYPct(topCornerW) },
      topRight: { xPct: 1 - CORNER_INSET_PCT, yPct: toYPct(topCornerW) },
      bottomLeft: { xPct: CORNER_INSET_PCT, yPct: toYPct(bottomCornerW) },
      bottomRight: { xPct: 1 - CORNER_INSET_PCT, yPct: toYPct(bottomCornerW) },
    },
    bubbleRadiusPct: bubbleRadiusW,
    rows,
    bubbles: rows.flatMap((row) => row.options),
    columnHeaderYPct: toYPct(columnHeaderCenterW),
    columnHeaders,
  };
}

/** Kept for anything that still wants the plain A4 ratio (e.g. print-size expectations). */
export const SHEET_ASPECT_RATIO = SHEET_WIDTH_MM / 297;
