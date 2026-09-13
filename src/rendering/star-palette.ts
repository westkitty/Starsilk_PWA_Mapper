/**
 * ASSET15: Blackbody Spectral Palette.
 * Morgan-Keenan spectral classification star colors and black hole gravitational lensing ring palette.
 */

export interface SpectralClassInfo {
  class: "O" | "B" | "A" | "F" | "G" | "K" | "M" | "D" | "BH";
  tempK: number;
  colorHex: string;
  name: string;
}

export const SPECTRAL_PALETTE: Record<string, SpectralClassInfo> = {
  O: { class: "O", tempK: 40000, colorHex: "#9bb0ff", name: "Blue Hypergiant" },
  B: { class: "B", tempK: 20000, colorHex: "#bbccff", name: "Blue-White Star" },
  A: { class: "A", tempK: 8500, colorHex: "#f8f9ff", name: "White Main-Sequence" },
  F: { class: "F", tempK: 6500, colorHex: "#ffffed", name: "Yellow-White Star" },
  G: { class: "G", tempK: 5700, colorHex: "#fff4e8", name: "Yellow Dwarf (Solar)" },
  K: { class: "K", tempK: 4500, colorHex: "#ffddb4", name: "Orange Dwarf" },
  M: { class: "M", tempK: 3200, colorHex: "#ffbd6f", name: "Red Dwarf" },
  D: { class: "D", tempK: 12000, colorHex: "#e0f2fe", name: "White Dwarf Remnant" },
  BH: { class: "BH", tempK: 0, colorHex: "#38bdf8", name: "Singularity Event Horizon" },
};
