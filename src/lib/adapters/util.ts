// Deterministic pseudo-random helper — identical to the inline generator in
// creditcrew.functions.ts so mock adapters produce byte-identical output.

export function seededRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

export function currentMode(): "mock" | "sandbox" {
  const mode = (typeof process !== "undefined" ? process.env?.DATA_SOURCE_MODE : undefined) ?? "mock";
  return mode === "sandbox" ? "sandbox" : "mock";
}
