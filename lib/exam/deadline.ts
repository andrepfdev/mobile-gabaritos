import { Exam } from '../localDb/schema';

/**
 * A prova é considerada vencida a partir do dia seguinte ao prazo (o prazo
 * continua editável durante o próprio dia marcado). Provas sem prazo nunca
 * vencem.
 *
 * Isto é só a checagem de data — quem decide se isso deve travar algo na UI
 * combina este resultado com `hasActiveSubscription` (hooks/useSubscriptionStatus.ts):
 * a trava é uma medida anti-abuso do plano gratuito, não uma limitação do
 * produto, então contas com assinatura ativa nunca devem ser bloqueadas por
 * este motivo.
 */
export function isExamPastDue(exam: Pick<Exam, 'dueDate'>): boolean {
  if (!exam.dueDate) return false;
  const endOfDueDate = new Date(`${exam.dueDate}T23:59:59`);
  return !Number.isNaN(endOfDueDate.getTime()) && endOfDueDate.getTime() < Date.now();
}

/** Formata como YYYY-MM-DD, mesmo formato usado por `dueDate` nos formulários de prova. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
