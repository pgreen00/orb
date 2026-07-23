# Orb Design System

A modern, framework-agnostic web component based design system. Orb provides a comprehensive set of reusable UI components that work seamlessly across all major frameworks and vanilla JavaScript applications.

## 🚀 Features

- **Framework Agnostic**: Built with Web Components, works with React, Angular, Vue, or no framework at all
- **TypeScript Support**: Full TypeScript definitions for all components
- **Accessible**: WCAG compliant components with proper ARIA attributes
- **Customizable**: Extensive theming support with CSS custom properties
- **Lightweight**: Tree-shakeable components for optimal bundle sizes
- **Modern**: Built with modern web standards and best practices

## 🛠️ Installation

### Vanilla JavaScript/HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="https://cdn.jsdelivr.net/npm/orb-style@latest/dist/loader.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/orb-style@latest/dist/styles/core.css"/>
</head>
<body>
  <orb-button>Click me!</orb-button>
</body>
</html>
```

### Angular

```bash
npm install orb-style
```

```typescript
// app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

//start the auto loader
import 'orb-style/loader'

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes)
  ]
};
```

```typescript
//app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <orb-button color="primary" (click)="handleClick()">Click me!</orb-button>
  `,
})
export class App {
  handleClick() {
    console.log('clicked')
  }
}
```

### React

```tsx
//Can optionally import individual components instead of using loader
import 'orb-style/orb-button';

function App() {
  return (
    <orb-button color="primary" onClick={() => console.log('clicked')}>
      Click me!
    </orb-button>
  );
}
```

## 📚 Documentation

Visit the [documentation site](https://orb.style) for:
- Component API reference
- Usage examples
- Theming guide
- Tutorials
- Installation instructions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Stencil](https://stenciljs.com/)
- Popovers and tooltips powered by [Floating UI](https://floating-ui.com)
- Date and calendar components utilize [date-fns](https://date-fns.org)

---
