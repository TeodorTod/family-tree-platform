import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

const MyPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e5ede7',
      100: '#cde0d2',
      200: '#a2c4ab',
      300: '#77a884',
      400: '#4b8b5c',
      500: '#2d4c2f',  // 🌲 Forest green (main)
      600: '#264327',
      700: '#1f3a20',
      800: '#183018',
      900: '#102710',
      950: '#081d08'
    },
    colorScheme: {
      light: {
        primary: {
          color: '#2d4c2f',
          inverseColor: '#ffffff',
          hoverColor: '#3e6f41',
          activeColor: '#1e2f1d'
        },
        highlight: {
          background: '#f5c842',      // 🌟 Gold yellow
          color: '#2d4c2f',
          focusBackground: '#f9d95c',
          focusColor: '#2d4c2f'
        }
      },
      dark: {
        primary: {
          color: '#f5c842',
          inverseColor: '#2d4c2f',
          hoverColor: '#f9d95c',
          activeColor: '#eec51c'
        },
        highlight: {
          background: 'rgba(245, 200, 66, .16)',
          focusBackground: 'rgba(245, 200, 66, .24)',
          color: 'rgba(255,255,255,.87)',
          focusColor: 'rgba(255,255,255,.87)'
        }
      }
    }
  },
    css: () => `
    html, body {
      font-family: 'Inter', system-ui, sans-serif;
    }
  `
});

export default MyPreset;
