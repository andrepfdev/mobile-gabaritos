function subjectPrefix(subject?: string): string {
  const cleaned = (subject ?? 'PROVA').normalize('NFD').toUpperCase();
  const letters = cleaned.replace(/[^A-Z]/g, '');
  return (letters || 'PRV').slice(0, 3).padEnd(3, 'X');
}

/** Generates a short human-readable exam code (e.g. "MAT006") printed on the gabarito sheet. */
export function generateExamCode(subject: string | undefined, sequence: number): string {
  const number = String(Math.max(1, sequence)).padStart(3, '0');
  return `${subjectPrefix(subject)}${number}`;
}
