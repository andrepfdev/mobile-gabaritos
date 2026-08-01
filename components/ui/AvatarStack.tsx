import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Text } from './Text';

export type Avatar = { uri?: string; initials?: string };

export type AvatarStackProps = {
  avatars: Avatar[];
  size?: number;
  maxVisible?: number;
  overlap?: number;
};

export function AvatarStack({ avatars, size = 28, maxVisible = 4, overlap = 10 }: AvatarStackProps) {
  const visible = avatars.slice(0, maxVisible);
  const overflow = avatars.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((avatar, i) => (
        <View
          key={i}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: visible.length - i,
            },
          ]}
        >
          {avatar.uri ? (
            <Image source={{ uri: avatar.uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
          ) : (
            <Text variant="caption" weight="medium" color={colors.textOnDark}>
              {avatar.initials ?? '?'}
            </Text>
          )}
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.avatar,
            styles.overflow,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -overlap, zIndex: 0 },
          ]}
        >
          <Text variant="caption" weight="medium" color={colors.textPrimary}>
            {`+${overflow}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  overflow: {
    backgroundColor: colors.grayLight,
  },
});
