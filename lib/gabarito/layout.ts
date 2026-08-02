export const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/** Builds the A-D or A-E option letters for an exam's chosen number of alternatives. */
export function optionsForCount(optionsCount: 4 | 5): string[] {
  return DEFAULT_OPTIONS.slice(0, optionsCount);
}

/** A4 width in mm, used only as the reference for width-relative absolute measurements below. */
const SHEET_WIDTH_MM = 210;

const CORNER_INSET_PCT = 0.035;
const CORNER_MARK_SIZE_PCT = 0.03;
// All of the constants below are expressed as a fraction of the sheet's WIDTH (not height) —
// the sheet's height is derived from actual content (header + however many rows fit), instead of
// assuming a fixed A4 height and hoping the content matches it. This is what avoids both an
// overlap (content taller than a fixed guess) and a big empty gap (content shorter than it).
const HEADER_HEIGHT_W = 0.115;
const GRID_TOP_GAP_W = 0.02;
const ROW_HEIGHT_W = 0.082;
// Clear gap between the last row's stripe and the bottom corner marks (bigger than the corner
// mark's own half-size) so the two never touch/overlap regardless of rounding.
const BOTTOM_MARGIN_W = CORNER_INSET_PCT + CORNER_MARK_SIZE_PCT;
const COLUMN_GAP_W = 0.04;
// Just enough width for a 1-2 digit question number — the label doesn't need a big share of the row.
const LABEL_WIDTH_RATIO = 0.09;
// Center-to-center spacing between bubbles, as a multiple of bubble diameter.
const BUBBLE_PITCH_FACTOR = 2.2;
// Bubble diameter as a fraction of row height — the main lever for "bigger circles".
const BUBBLE_HEIGHT_RATIO = 0.85;
// Small left padding so rows don't start flush against the corner-inset margin.
const ROW_LEFT_PADDING_RATIO = 0.02;
const MAX_ROWS_PER_COLUMN = 25;

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

export type GabaritoLayout = {
  questionCount: number;
  options: string[];
  aspectRatio: number;
  headerHeightPct: number;
  cornerMarkSizePct: number;
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomLeft: Point;
    bottomRight: Point;
  };
  bubbleRadiusPct: number;
  rows: QuestionRow[];
  bubbles: BubblePosition[];
};

/**
 * Pure percentage-based geometry for a gabarito sheet (0..1 relative to the sheet's own
 * width/height). Shared by the export renderer (GabaritoSheet) and the camera scanner
 * (lib/gabarito/scan.ts) so both agree on exactly where every bubble and corner marker is,
 * regardless of the pixel dimensions each one renders/captures at.
 *
 * The sheet's height (and therefore `aspectRatio`) is derived from how many rows actually fit,
 * not fixed to A4's — a short exam gets a short, tightly-cropped sheet instead of a full A4 page
 * with a lot of unused blank space at the bottom.
 */
export function buildGabaritoLayout(questionCount: number, options: string[] = DEFAULT_OPTIONS): GabaritoLayout {
  const columns = questionCount > MAX_ROWS_PER_COLUMN ? 2 : 1;
  const rowsPerColumn = Math.ceil(questionCount / columns);
  const columnWidthW = (1 - 2 * CORNER_INSET_PCT - (columns - 1) * COLUMN_GAP_W) / columns;
  const labelWidthW = columnWidthW * LABEL_WIDTH_RATIO;

  // Bubble size is driven by row height (vertical density) but capped so the tightly-pitched
  // group of bubbles still fits within the column width even for many options / narrow columns.
  const maxDiameterFromWidthW = (columnWidthW - labelWidthW) / ((options.length - 1) * BUBBLE_PITCH_FACTOR + 1);
  const bubbleDiameterW = Math.min(ROW_HEIGHT_W * BUBBLE_HEIGHT_RATIO, maxDiameterFromWidthW);
  const bubbleRadiusW = bubbleDiameterW / 2;
  const bubblePitchW = bubbleDiameterW * BUBBLE_PITCH_FACTOR;

  const gridTopW = HEADER_HEIGHT_W + GRID_TOP_GAP_W;
  const gridHeightW = rowsPerColumn * ROW_HEIGHT_W;
  const totalHeightW = gridTopW + gridHeightW + BOTTOM_MARGIN_W;
  const aspectRatio = 1 / totalHeightW;

  // Convert every width-relative measurement above into a fraction of the *final* sheet height,
  // matching the Point/percentage API the rest of the app already expects.
  const toYPct = (valueW: number) => valueW / totalHeightW;

  const rows: QuestionRow[] = [];
  for (let q = 1; q <= questionCount; q++) {
    const columnIndex = Math.floor((q - 1) / rowsPerColumn);
    const rowIndex = (q - 1) % rowsPerColumn;
    const columnLeft = CORNER_INSET_PCT + columnIndex * (columnWidthW + COLUMN_GAP_W);
    const rowCenterW = gridTopW + rowIndex * ROW_HEIGHT_W + ROW_HEIGHT_W / 2;

    // Left-align the number+bubbles cluster (like a real scantron sheet) instead of centering it
    // in the column — centering left big empty margins on *both* sides once bubbles were made
    // compact; left-aligning only leaves the (expected) leftover space on the right.
    const groupLeft = columnLeft + columnWidthW * ROW_LEFT_PADDING_RATIO;
    const optionsAreaLeft = groupLeft + labelWidthW;

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
      topLeft: { xPct: CORNER_INSET_PCT, yPct: toYPct(CORNER_INSET_PCT) },
      topRight: { xPct: 1 - CORNER_INSET_PCT, yPct: toYPct(CORNER_INSET_PCT) },
      bottomLeft: { xPct: CORNER_INSET_PCT, yPct: toYPct(totalHeightW - CORNER_INSET_PCT) },
      bottomRight: { xPct: 1 - CORNER_INSET_PCT, yPct: toYPct(totalHeightW - CORNER_INSET_PCT) },
    },
    bubbleRadiusPct: bubbleRadiusW,
    rows,
    bubbles: rows.flatMap((row) => row.options),
  };
}

/** Kept for anything that still wants the plain A4 ratio (e.g. print-size expectations). */
export const SHEET_ASPECT_RATIO = SHEET_WIDTH_MM / 297;
