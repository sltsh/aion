export const mapValues = <K extends string, A, B>(
  source: Record<K, A>,
  transform: (value: A, key: K) => B,
): Record<K, B> =>
  Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, transform(value as A, key as K)]),
  ) as Record<K, B>;
