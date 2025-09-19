// app/utils/colors.ts
// Senin verdiğin rampayı, opsiyonel opaklıkla RGBA döndürecek hale getirdim.
export function colorForRisk(r: number, opacity: number = 0.85) {
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  r = clamp(r);
  const g  = r < 0.5 ? 255 : Math.round(255 * (1 - (r - 0.5) * 2));
  const rr = r < 0.5 ? Math.round(510 * r) : 255;
  const b  = 0;
  return `rgba(${rr},${g},${b},${clamp(opacity)})`;
}
