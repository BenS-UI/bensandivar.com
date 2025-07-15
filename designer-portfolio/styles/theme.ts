export interface Theme {
  colors: {
    base: string;
    surface: string;
    overlay: string;
    primary: string;
    secondary: string;
    accent: string;
    gradientStart: string;
    gradientEnd: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export const lightTheme: Theme = {
  colors: {
    base: '#F3F4F6', // Light gray for base background
    surface: '#FFFFFF', // White for cards, etc.
    overlay: '#E5E7EB', // Slightly darker gray for overlays/badges
    primary: '#1F2937', // Dark gray for primary text
    secondary: '#6B7280', // Medium gray for secondary text
    accent: '#4F46E5', // Indigo accent
    gradientStart: '#F9FAFB', // very light gray
    gradientEnd: '#E5E7EB', // light gray
  },
  fonts: {
    heading: 'Geologica, sans-serif',
    body: 'Gabarito, sans-serif',
  },
};