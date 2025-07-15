import { lightTheme, Theme } from './theme';

const createCssVariables = (theme: Theme): string => {
  let variables = '';
  for (const [key, value] of Object.entries(theme.colors)) {
    variables += `--color-${key}: ${value};\n`;
  }
  for (const [key, value] of Object.entries(theme.fonts)) {
    variables += `--font-${key}: '${value}';\n`;
  }
  return variables;
};

export const createGlobalStyles = (): string => {
  const theme = lightTheme;
  return `
    :root {
      ${createCssVariables(theme)}
    }

    body {
      background-color: var(--color-base);
      background-image: linear-gradient(135deg, var(--color-gradientStart), var(--color-gradientEnd));
      background-attachment: fixed;
      color: var(--color-primary);
      font-family: ${theme.fonts.body};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Scrollbar Hiding Utility */
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--color-overlay);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--color-accent);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      filter: brightness(1.2);
    }

    .prose {
        --tw-prose-body: var(--color-secondary);
        --tw-prose-headings: var(--color-primary);
        --tw-prose-lead: var(--color-primary);
        --tw-prose-bold: var(--color-primary);
        --tw-prose-counters: var(--color-secondary);
        --tw-prose-bullets: var(--color-secondary);
    }

    /* Visual Editor Styles */
    body.visual-editor-active [data-editable-path]:hover {
      outline: 2px dashed var(--color-accent);
      outline-offset: 4px;
      cursor: text;
    }

    body.visual-editor-active [contentEditable="true"] {
        -webkit-user-modify: read-write-plaintext-only;
    }

    elevenlabs-convai {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 10000 !important;
      transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
      transform-origin: bottom right;
    }

    body:not(.visual-editor-active) elevenlabs-convai {
        transform: scale(0);
        opacity: 0;
        pointer-events: none;
    }
  `;
};
