export const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/** A4 portrait ratio (width/height) — the printed sheet targets A4 so it imports cleanly into a text document. */
export const SHEET_ASPECT_RATIO = 210 / 297;

const CORNER_INSET_PCT = 0.035;
const CORNER_MARK_SIZE_PCT = 0.03;
// Sized for a 2-line title at the reduced header font size (see GabaritoSheet) — big enough to
// avoid overlap, small enough to not leave a big empty gap for shorter titles.
const HEADER_HEIGHT_PCT = 0.14;
const GRID_TOP_PCT = HEADER_HEIGHT_PCT + 0.02;
const GRID_BOTTOM_PCT = 0.95;
// Rows never grow taller than this, regardless of how few questions there are — keeps the grid
// compact (like a real scantron sheet) instead of stretching to fill the whole page.
const MAX_ROW_HEIGHT_PCT = 0.075;
const COLUMN_GAP_PCT = 0.04;
// Just enough width for a 1-2 digit question number — the label doesn't need a big share of the row.
const LABEL_WIDTH_RATIO = 0.09;
// Center-to-center spacing between bubbles, as a multiple of bubble diameter — keeps the
// alternatives clustered together instead of spread across the full column width, while still
// using a reasonable share of the page (rows are left-aligned, not centered — see below).
const BUBBLE_PITCH_FACTOR = 2.2;
// Bubble diameter as a fraction of row height — the main lever for "bigger circles".
const BUBBLE_HEIGHT_RATIO = 0.75;
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
 */
export function buildGabaritoLayout(questionCount: number, options: string[] = DEFAULT_OPTIONS): GabaritoLayout {
  const columns = questionCount > MAX_ROWS_PER_COLUMN ? 2 : 1;
  const rowsPerColumn = Math.ceil(questionCount / columns);
  const columnWidth = (1 - 2 * CORNER_INSET_PCT - (columns - 1) * COLUMN_GAP_PCT) / columns;
  const rowHeight = Math.min((GRID_BOTTOM_PCT - GRID_TOP_PCT) / rowsPerColumn, MAX_ROW_HEIGHT_PCT);
  const labelWidth = columnWidth * LABEL_WIDTH_RATIO;

  // Bubble size is driven by row height (vertical density) but capped so the tightly-pitched
  // group of bubbles still fits within the column width even for many options / narrow columns.
  const maxDiameterFromWidth = (columnWidth - labelWidth) / ((options.length - 1) * BUBBLE_PITCH_FACTOR + 1);
  const bubbleDiameterPct = Math.min(rowHeight * BUBBLE_HEIGHT_RATIO, maxDiameterFromWidth);
  const bubbleRadiusPct = bubbleDiameterPct / 2;
  const bubblePitchPct = bubbleDiameterPct * BUBBLE_PITCH_FACTOR;

  const rows: QuestionRow[] = [];
  for (let q = 1; q <= questionCount; q++) {
    const columnIndex = Math.floor((q - 1) / rowsPerColumn);
    const rowIndex = (q - 1) % rowsPerColumn;
    const columnLeft = CORNER_INSET_PCT + columnIndex * (columnWidth + COLUMN_GAP_PCT);
    const rowY = GRID_TOP_PCT + rowIndex * rowHeight + rowHeight / 2;

    // Left-align the number+bubbles cluster (like a real scantron sheet) instead of centering it
    // in the column — centering left big empty margins on *both* sides once bubbles were made
    // compact; left-aligning only leaves the (expected) leftover space on the right.
    const groupLeft = columnLeft + columnWidth * ROW_LEFT_PADDING_RATIO;
    const optionsAreaLeft = groupLeft + labelWidth;

    const rowOptions: BubblePosition[] = options.map((option, i) => ({
      question: q,
      option,
      center: {
        xPct: optionsAreaLeft + bubbleRadiusPct + i * bubblePitchPct,
        yPct: rowY,
      },
    }));

    rows.push({
      question: q,
      labelCenter: { xPct: groupLeft + labelWidth * 0.4, yPct: rowY },
      options: rowOptions,
      band: {
        xPct: columnLeft,
        yPct: rowY - rowHeight / 2,
        widthPct: columnWidth,
        heightPct: rowHeight,
      },
    });
  }

  return {
    questionCount,
    options,
    aspectRatio: SHEET_ASPECT_RATIO,
    headerHeightPct: HEADER_HEIGHT_PCT,
    cornerMarkSizePct: CORNER_MARK_SIZE_PCT,
    corners: {
      topLeft: { xPct: CORNER_INSET_PCT, yPct: CORNER_INSET_PCT },
      topRight: { xPct: 1 - CORNER_INSET_PCT, yPct: CORNER_INSET_PCT },
      bottomLeft: { xPct: CORNER_INSET_PCT, yPct: 1 - CORNER_INSET_PCT },
      bottomRight: { xPct: 1 - CORNER_INSET_PCT, yPct: 1 - CORNER_INSET_PCT },
    },
    bubbleRadiusPct,
    rows,
    bubbles: rows.flatMap((row) => row.options),
  };
}
