import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { StatusTag } from '../ui/StatusTag';
import { AvatarStack, Avatar } from '../ui/AvatarStack';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, spacing } from '../../theme/tokens';
import { Exam } from '../../lib/localDb/schema';

export type ExamCardProps = {
  exam: Exam;
  progress?: number; // 0-1, omitted/ignored when status is 'waiting'
  onPress?: () => void;
  /** Overrides exam.students (legacy, always empty) with the real roster of the linked turma. */
  rosterStudents?: { id: string; name: string; avatarUri?: string }[];
};

function formatDueDate(dueDate?: string) {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ExamCard({ exam, progress = 0, onPress, rosterStudents }: ExamCardProps) {
  const avatars: Avatar[] = (rosterStudents ?? exam.students).map((s) => ({
    uri: s.avatarUri,
    initials: s.name.slice(0, 2).toUpperCase(),
  }));
  const isWaiting = exam.status === 'waiting';
  const dueDateLabel = formatDueDate(exam.dueDate);

  return (
    <Pressable onPress={onPress}>
      <Card variant="light" style={styles.card}>
        <Text variant="h2" weight="bold">
          {exam.title}
        </Text>
        {exam.subject || exam.className ? (
          <Text variant="body" color={colors.textMuted} style={styles.description}>
            {[exam.subject, exam.className].filter(Boolean).join(' — ')}
          </Text>
        ) : null}
        {dueDateLabel ? (
          <Text variant="caption" color={colors.textMuted} style={styles.description}>
            {`Prazo: ${dueDateLabel}`}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {isWaiting ? (
            <StatusTag.Waiting />
          ) : exam.priority === 'medium' ? (
            <StatusTag.Medium />
          ) : (
            <View />
          )}
          <AvatarStack avatars={avatars} />
        </View>

        {!isWaiting ? (
          <View style={styles.progressRow}>
            <View style={styles.progressBarWrap}>
              <ProgressBar progress={progress} />
            </View>
            <Text variant="caption" weight="medium" color={colors.textMuted}>
              {`${Math.round(progress * 100)}%`}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  description: {
    marginTop: spacing.xs / 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressBarWrap: {
    flex: 1,
    marginRight: spacing.sm,
  },
});
