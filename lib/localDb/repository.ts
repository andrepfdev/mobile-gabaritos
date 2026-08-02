import AsyncStorage from '@react-native-async-storage/async-storage';

// Only used by store/examStore.ts's one-time migration of pre-SQLite AsyncStorage data — see
// lib/db/* for the current storage layer.
export async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}
