# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm start` (runs `ng serve`)
- **Build for production**: `npm run build`
- **Watch build**: `npm run watch` (development build with watch mode)
- **Run tests**: `npm test` (headless Chrome with coverage)
- **Lint code**: `npm run lint`
- **Type checking**: `npm run type-check`
- **E2E tests**: `npm run cypress`
- **Production build for Vercel**: `npm run vercel-build` (includes environment setup)

## Project Architecture

This is an Angular 19 application for a tabletop RPG (JDR) module creation and management platform.

### Core Architecture

**Block-Based Content System**: The application centers around a modular block system where content is organized into different block types:
- `ParagraphBlock`: Text content with rich text editing
- `StatBlock`: RPG character/monster statistics
- `PictureBlock`: Image content
- `MusicBlock`: Audio content
- `IntegratedModuleBlock`: Embedded modules

All blocks inherit from the abstract `Block` class (src/app/classes/Block.ts) and are managed through a centralized block system with dedicated components in `src/app/components/blocksComponents/`.

**Module System**: Content is organized into `Module` objects that contain versioned collections of blocks. Modules support:
- Versioning through `ModuleVersion` class
- Access control via `ModuleAccess` 
- Template functionality for reusable content
- Tagging and categorization

**User Management**: Built on Firebase Auth with custom user profiles supporting:
- User folders for organization
- Saved modules
- Collaborative access to modules

### Key Services Architecture

**HTTP Services**: Located in `src/app/services/https/`, following a pattern where each entity has its own HTTP service (e.g., `module-http.service.ts`, `block-http.service.ts`).

**State Management**: Uses Angular services for state management with a centralized `module.service.ts` handling module-related operations.

**Internationalization**: Uses ngx-translate with French as default language, translations in `src/assets/i18n/`.

### Styling System

Uses SCSS with a modular architecture:
- Core styles in `src/assets/sass/core/`
- Component-specific styles in `src/assets/sass/components/`
- Theme system with light/dark variants in `src/assets/sass/themes/`
- PrimeNG integration with Aura theme

### Environment Configuration

The application requires Firebase configuration which is generated at build time:
- `setup-env.js` creates `environment.secret.ts` from environment variables
- Three environment files: base, development, and production
- Required environment variables for Firebase: API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID

### Testing Strategy

- Unit tests with Jasmine/Karma using headless Chrome
- E2E tests with Cypress
- Component-level testing with Angular Testing Utilities
- Code coverage reporting enabled