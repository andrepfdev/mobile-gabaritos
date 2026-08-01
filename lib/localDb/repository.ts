import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

export async function upsert<T extends Record<string, unknown>>(
  key: string,
  item: T,
  idField: keyof T,
): Promise<T[]> {
  const all = await getAll<T>(key);
  const index = all.findIndex((existing) => existing[idField] === item[idField]);
  if (index >= 0) {
    all[index] = item;
  } else {
    all.push(item);
  }
  await AsyncStorage.setItem(key, JSON.stringify(all));
  return all;
}

export async function remove<T extends Record<string, unknown>>(
  key: string,
  id: unknown,
  idField: keyof T,
): Promise<T[]> {
  const all = await getAll<T>(key);
  const filtered = all.filter((existing) => existing[idField] !== id);
  await AsyncStorage.setItem(key, JSON.stringify(filtered));
  return filtered;
}
