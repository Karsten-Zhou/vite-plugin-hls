/**
 * Converts a human-readable bitrate such as "1200k", "2.5M" or "1G"
 * into the equivalent number of bits per second.
 */
export function bitrateToNumber(bitrate: string): number {
  const match = /^([\d.]+)\s*([kKmMgG]?)$/.exec(bitrate.trim());

  if (!match) {
    throw new Error(`[vite-plugin-hls] Invalid bitrate: ${bitrate}`);
  }

  const amount = Number(match[1]);

  const suffix = (match[2] ?? "").toLowerCase();

  const multiplier =
    suffix === "g"
      ? 1_000_000_000
      : suffix === "m"
        ? 1_000_000
        : suffix === "k"
          ? 1_000
          : 1;

  return Math.round(amount * multiplier);
}
