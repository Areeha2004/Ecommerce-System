export function colorToCss(color: string): string {
  const normalized = color.trim().toLowerCase();
  const map: Record<string, string> = {
    white: "#f5f5f5",
    black: "#111111",
    beige: "#d5c3a1",
    navy: "#1f2a44",
    olive: "#708238",
    khaki: "#c3b091",
    brown: "#7a4e2d",
    tan: "#d2b48c",
    red: "#c62828",
    blue: "#1e5aa8",
    pink: "#d86f9f",
    grey: "#7a7a7a",
    gray: "#7a7a7a",
    gold: "#b08d57",
    silver: "#a8a8a8",
    natural: "#d8c3a5",
    striped: "repeating-linear-gradient(45deg, #1f2a44 0 8px, #f5f5f5 8px 16px)",
    tortoise: "#6d4c41",
    cognac: "#9a5a31",
    camel: "#c19a6b",
    "light wash": "#8bb5d9",
    "dark wash": "#2a3f5f",
    "light blue": "#8ab6e8",
    "floral red": "linear-gradient(135deg, #b73a3a, #f5b3b3)",
    "floral blue": "linear-gradient(135deg, #2f5ea8, #a9c8f2)",
    "silver/black": "linear-gradient(135deg, #c0c0c0 0 50%, #111111 50% 100%)",
    "gold/brown": "linear-gradient(135deg, #b08d57 0 50%, #7a4e2d 50% 100%)",
  };

  if (map[normalized]) return map[normalized];
  return "#9aa0a6";
}
