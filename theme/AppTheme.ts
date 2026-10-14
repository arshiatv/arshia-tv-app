// This file contains ONLY theme definitions - no imports, no logic

export const Theme = {
  colors: {
    // ⚠️ SEMANTIC PALETTE — these MUST stay flat color STRINGS (never nested objects).
    // Generated code frequently writes `color: AppTheme.colors.text` directly, so if
    // `text` were an object the app would crash with "Failed to load app component".
    // Customize the hex values for your app, but keep every key below a string.
    //
    // Arshia TV palette: crimson signal red on deep midnight navy (cinema dark).
    primary: '#E63946',
    primaryDark: '#B01F2C',
    primaryLight: '#FF6B75',
    secondary: '#1D3557',
    accent: '#FFB703',
    // Backgrounds & surfaces
    background: '#0A0E17',
    backgroundSecondary: '#111826',
    surface: '#151D2E',
    card: '#151D2E',
    overlay: 'rgba(4,7,13,0.72)',
    // Text (flat strings — also expose *Secondary/*Muted variants the AI commonly uses)
    text: '#FFFFFF',
    textSecondary: '#A8B4C8',
    textMuted: '#6C7A90',
    textInverse: '#0A0E17',
    // Lines & states
    border: 'rgba(255,255,255,0.12)',
    divider: 'rgba(255,255,255,0.07)',
    disabled: '#33405A',
    placeholder: '#6C7A90',
    // Status colors
    success: '#2ED47A',
    error: '#FF4D5E',
    danger: '#FF4D5E',
    warning: '#FFB703',
    info: '#3B82F6',
    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    // Modern gradient presets for premium look
    gradient: {
      // Must be a 2+ color ARRAY — LinearGradient calls colors.map(), so an empty
      // string crashed apps with "Cannot read property 'map' of undefined".
      primary: ['#E63946', '#B01F2C'],
      secondary: ['#1D3557', '#0A0E17'],
      success: ['#11998e', '#38ef7d'],
      info: ['#4facfe', '#00f2fe'],
      warning: ['#FFB703', '#E63946'],
      danger: ['#E63946', '#7A0F19'],
      dark: ['#111826', '#0A0E17'],
    },
    // Glassmorphism colors
    glass: {
      light: 'rgba(255, 255, 255, 0.08)',
      medium: 'rgba(255, 255, 255, 0.16)',
      dark: 'rgba(0, 0, 0, 0.35)',
      border: 'rgba(255, 255, 255, 0.14)',
    },
    // Tab bar / selection states (for navigation)
    selection: {
      active: '#E63946',
      inactive: '#6C7A90',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    full: 9999,
  },
  // Modern elevation system (shadows & depth)
  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 18,
    },
  },
  typography: {
    fontSize: {
      xs: 10,
      sm: 12,
      md: 14,
      regular: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      title: 20,
      heading: 24,
      display: 28,
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  // Alias for backward compatibility with generated code
  fontSizes: {
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
  },
  // Animation timing constants
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  // Opacity levels for consistent alpha values
  opacity: {
    disabled: 0.4,
    hover: 0.8,
    pressed: 0.6,
    overlay: 0.5,
  },
};

export const AppTheme = Theme;
      
