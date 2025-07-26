export const COLORS = {
  // Background
  white: "#FFFFFF",

  // Primary Elements
  deepNavy: "#0C1E3C",
  slateGray: "#4A5568",

  // Secondary Elements
  warmBeige: "#F5EDE0",
  mutedTeal: "#3D828B",

  // Alerts / Highlights
  safetyAmber: "#FFB100",
  softCoral: "#E37B7B",

  // Additional colors for safety indicators
  safeGreen: "#10B981",
  warningRed: "#EF4444",
  neutralGray: "#9CA3AF",
};

export const FONTS = {
  headline: "System", // Will use system font, can be updated to custom fonts
  body: "System",
  sizes: {
    small: 12,
    medium: 16,
    large: 20,
    xlarge: 24,
    xxlarge: 32,
  },
  weights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 50,
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  heavy: {
    shadowColor: COLORS.deepNavy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export const SAFETY_LEVELS = {
  HIGH: { color: COLORS.safeGreen, label: "Safe" },
  MEDIUM: { color: COLORS.safetyAmber, label: "Caution" },
  LOW: { color: COLORS.warningRed, label: "Risk" },
};
