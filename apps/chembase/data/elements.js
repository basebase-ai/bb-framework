/**
 * ChemBase - Periodic Table Data
 * First 30 elements for learning basics.
 */

export const elements = {
  1: { name: "Hydrogen", symbol: "H", mass: 1.008, type: "Non-Metal" },
  2: { name: "Helium", symbol: "He", mass: 4.003, type: "Noble Gas" },
  3: { name: "Lithium", symbol: "Li", mass: 6.94, type: "Metal" },
  4: { name: "Beryllium", symbol: "Be", mass: 9.012, type: "Metal" },
  5: { name: "Boron", symbol: "B", mass: 10.81, type: "Metalloid" },
  6: { name: "Carbon", symbol: "C", mass: 12.01, type: "Non-Metal" },
  7: { name: "Nitrogen", symbol: "N", mass: 14.01, type: "Non-Metal" },
  8: { name: "Oxygen", symbol: "O", mass: 16.00, type: "Non-Metal" },
  9: { name: "Fluorine", symbol: "F", mass: 19.00, type: "Non-Metal" },
  10: { name: "Neon", symbol: "Ne", mass: 20.18, type: "Noble Gas" },
  11: { name: "Sodium", symbol: "Na", mass: 22.99, type: "Metal" },
  12: { name: "Magnesium", symbol: "Mg", mass: 24.31, type: "Metal" },
  13: { name: "Aluminum", symbol: "Al", mass: 26.98, type: "Metal" },
  14: { name: "Silicon", symbol: "Si", mass: 28.09, type: "Metalloid" },
  15: { name: "Phosphorus", symbol: "P", mass: 30.97, type: "Non-Metal" },
  16: { name: "Sulfur", symbol: "S", mass: 32.06, type: "Non-Metal" },
  17: { name: "Chlorine", symbol: "Cl", mass: 35.45, type: "Non-Metal" },
  18: { name: "Argon", symbol: "Ar", mass: 39.95, type: "Noble Gas" },
  19: { name: "Potassium", symbol: "K", mass: 39.10, type: "Metal" },
  20: { name: "Calcium", symbol: "Ca", mass: 40.08, type: "Metal" },
  21: { name: "Scandium", symbol: "Sc", mass: 44.96, type: "Metal" },
  22: { name: "Titanium", symbol: "Ti", mass: 47.87, type: "Metal" },
  23: { name: "Vanadium", symbol: "V", mass: 50.94, type: "Metal" },
  24: { name: "Chromium", symbol: "Cr", mass: 52.00, type: "Metal" },
  25: { name: "Manganese", symbol: "Mn", mass: 54.94, type: "Metal" },
  26: { name: "Iron", symbol: "Fe", mass: 55.85, type: "Metal" },
  27: { name: "Cobalt", symbol: "Co", mass: 58.93, type: "Metal" },
  28: { name: "Nickel", symbol: "Ni", mass: 58.69, type: "Metal" },
  29: { name: "Copper", symbol: "Cu", mass: 63.55, type: "Metal" },
  30: { name: "Zinc", symbol: "Zn", mass: 65.38, type: "Metal" },
  31: { name: "Gallium", symbol: "Ga", mass: 69.72, type: "Metal" },
  32: { name: "Germanium", symbol: "Ge", mass: 72.63, type: "Metalloid" },
  33: { name: "Arsenic", symbol: "As", mass: 74.92, type: "Metalloid" },
  34: { name: "Selenium", symbol: "Se", mass: 78.97, type: "Non-Metal" },
  35: { name: "Bromine", symbol: "Br", mass: 79.90, type: "Non-Metal" },
  36: { name: "Krypton", symbol: "Kr", mass: 83.80, type: "Noble Gas" },
};

// Get Electron Configuration (Bohr Model)
export function getElectronConfig(electronCount) {
  const shells = [];
  let remaining = electronCount;

  // Shell capacities: 2, 8, 8, 18... (Simplified for first 20)
  // Note: Real chemistry is 2, 8, 18... but 19(K) goes 2-8-8-1
  
  // Shell 1 (K)
  const s1 = Math.min(remaining, 2);
  shells.push(s1);
  remaining -= s1;
  if (remaining === 0) return shells;

  // Shell 2 (L)
  const s2 = Math.min(remaining, 8);
  shells.push(s2);
  remaining -= s2;
  if (remaining === 0) return shells;

  // Shell 3 (M) - Fills to 8 before 4th starts (for Ca/K)
  // But technically cap is 18. For Z<=20, we treat it as 8.
  // For transition metals, it gets complex. We'll stick to simple view.
  const s3 = Math.min(remaining, 8); 
  shells.push(s3);
  remaining -= s3;
  if (remaining === 0) return shells;

  // Shell 4 (N) - For elements up to 36, we fill 4s first then 3d then 4p
  // Simplified: 4th shell can hold up to 8 for our purposes (2 in 4s + 6 in 4p)
  const s4 = Math.min(remaining, 8);
  shells.push(s4);
  remaining -= s4;

  return shells;
}

export function getValenceElectrons(electronCount) {
  const config = getElectronConfig(electronCount);
  return config[config.length - 1];
}

// Helper to check stability (simplified)
export function checkStability(protons, neutrons) {
  if (protons === 0) return "Empty";
  
  // Simple ratio check for light elements (N/Z approx 1)
  const ratio = neutrons / protons;
  
  if (protons === 1) {
    return neutrons < 2 ? "Stable" : "Unstable";
  }
  
  // Stability valley approximation
  if (ratio >= 1 && ratio <= 1.6) return "Stable";
  return "Unstable (Radioactive)";
}
