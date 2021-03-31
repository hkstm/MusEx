export const clip = (val: number, min: number, max: number): number => {
  return Math.min(Math.max(val, min), max);
};

export const capitalize = (s?: string) => {
  return (s?.charAt(0).toUpperCase() ?? "") + (s?.slice(1) ?? "");
};
