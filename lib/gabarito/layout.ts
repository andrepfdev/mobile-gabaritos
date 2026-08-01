export const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

/** A4 portrait ratio (width/height) — the printed sheet targets A4 so it imports cleanly into a text document. */
export const SHEET_ASPECT_RATIO = 210 / 297;

const CORNER_INSET_PCT = 0.035;
const CORNER_MARK_SIZE_PCT = 0.03;
const HEADER_HEIGHT_PCT = 0.18;
const GRID_TOP_PCT = HEADER_HEIGHT_PCT + 0.02;
const GRID_BOTTOM_PCT = 0.95;
const COLUMN_GAP_PCT = 0.04;
// Just enough width for a 1-2 digit question number — the label doesn't need a big share of the row.
const LABEL_WIDTH_RATIO = 0.09;
// Center-to-center spacing between bubbles, as a multiple of bubble diameter — keeps the
// alternatives clustered tightly together instead of spread across the full column width.
const BUBBLE_PITCH_FACTOR = 1.9;
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
  const rowHeight = (GRID_BOTTOM_PCT - GRID_TOP_PCT) / rowsPerColumn;
  const labelWidth = columnWidth * LABEL_WIDTH_RATIO;

  // Bubble size is driven by row height (vertical density) but capped so the tightly-pitched
  // group of bubbles still fits within the column width even for many options / narrow columns.
  const maxDiameterFromWidth = (columnWidth - labelWidth) / ((options.length - 1) * BUBBLE_PITCH_FACTOR + 1);
  const bubbleDiameterPct = Math.min(rowHeight * 0.56, maxDiameterFromWidth);
  const bubbleRadiusPct = bubbleDiameterPct / 2;
  const bubblePitchPct = bubbleDiameterPct * BUBBLE_PITCH_FACTOR;

  const rows: QuestionRow[] = [];
  for (let q = 1; q <= questionCount; q++) {
    const columnIndex = Math.floor((q - 1) / rowsPerColumn);
    const rowIndex = (q - 1) % rowsPerColumn;
    const columnLeft = CORNER_INSET_PCT + columnIndex * (columnWidth + COLUMN_GAP_PCT);
    const rowY = GRID_TOP_PCT + rowIndex * rowHeight + rowHeight / 2;

    // Center the compact number+bubbles cluster within the column, instead of spreading it
    // across the full column width, so rows don't end up with a big empty gap on one side.
    const groupWidth = labelWidth + (options.length - 1) * bubblePitchPct + bubbleDiameterPct;
    const groupLeft = columnLeft + Math.max(0, (columnWidth - groupWidth) / 2);
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
