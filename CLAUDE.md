# AccentShadow - Pronunciation Practice App

## Project Overview

AccentShadow is a sophisticated Vue 3-based language learning pronunciation app that allows users to compare their recorded pronunciation with target audio files. The app features advanced audio visualization using WaveSurfer.js with spectrograms, mobile-first responsive design, comprehensive audio effects, and intelligent recording set management.

## Development Philosophy

### Idiomatic Vue 3 Development

This project emphasizes **idiomatic Vue 3 development practices** with strict adherence to:

- **Component-Driven Architecture** - Reusable, single-responsibility components
- **Props Down, Events Up** - Unidirectional data flow with proper event emission
- **Composition API** - Logical concern grouping with composables
- **Separation of Concerns** - Clear boundaries between UI, business logic, and data
- **TypeScript First** - Full type safety throughout the codebase
- **Reactive Design Patterns** - Leveraging Vue's reactivity system effectively

### Development Environment

**IMPORTANT**: A development server is **always running** in a separate terminal during active development. **Never start a dev server** - if MCP browser interaction is needed, request the port number.

**Build Quality Assurance**: Always verify that builds work and check for TypeScript errors regularly during development using `npm run build` and `npm run type-check`.

**Commit Workflow**: **ALWAYS ASK THE USER BEFORE EXECUTING COMMITS**. It's fine to stage files (`git add`) and prepare commit messages, but always ask for explicit permission before running `git commit`, even for documentation or cleanup changes.

## Audio Processing & Cross-Browser Debugging

**IMPORTANT**: When working on audio-related issues, particularly:
- Audio alignment problems between browsers
- Speech detection inconsistencies  
- VAD (Voice Activity Detection) trimming issues
- Sample rate related bugs
- Timing differences in processed audio

**→ READ: [`AUDIO_SAMPLING_RATE_DEBUG.md`](./AUDIO_SAMPLING_RATE_DEBUG.md)**

This document contains a comprehensive technical deep-dive into the complex audio sampling rate issues we solved and the critical pre-padding solution implemented. It explains why Chrome and Firefox were processing audio differently and how our 320ms pre-padding strategy ensures consistent cross-browser behavior.

## Accessibility Standards & Testing

**IMPORTANT**: This application maintains **WCAG 2.1 AA compliance** and comprehensive accessibility standards.

### Accessibility Testing Framework

The project includes automated accessibility testing using **axe-core** with comprehensive test coverage:

- **Full Accessibility Audit**: `tests/integration/full-accessibility-audit.test.js`
- **Basic Accessibility Test**: `tests/integration/accessibility.test.js`

**Run accessibility tests**: `npm test -- tests/integration/full-accessibility-audit.test.js`

### Key Accessibility Features Implemented

1. **Form Controls & Labeling**
   - All form inputs have proper `<label>` associations
   - Speed control slider includes ARIA attributes and live regions
   - Unique IDs generated for form control relationships

2. **Semantic HTML Structure**
   - Proper heading hierarchy (H1 → H2 → H3)
   - Semantic landmarks without conflicts
   - Screen reader compatible navigation

3. **Audio Controls Accessibility**
   - Audio controls include proper ARIA labels
   - Playback state announcements via `aria-live` regions
   - Keyboard navigation support maintained

4. **Mobile Accessibility**
   - Touch-friendly target sizes (44px minimum)
   - Screen reader compatibility on mobile devices
   - Proper focus management for touch interfaces

### Accessibility Development Guidelines

When adding new components or features:

1. **Always run accessibility tests** before committing changes
2. **Include proper ARIA attributes** for interactive elements
3. **Maintain heading hierarchy** - never skip heading levels
4. **Test with keyboard navigation** - ensure all functionality is accessible
5. **Verify color contrast** meets WCAG AA standards (4.5:1 ratio)
6. **Add labels to form controls** - use `<label>`, `aria-label`, or `aria-labelledby`

### Testing Commands

```bash
# Run full accessibility audit
npm test -- tests/integration/full-accessibility-audit.test.js

# Run basic accessibility test
npm test -- tests/integration/accessibility.test.js

# Run all tests including accessibility
npm test
```

**Status**: ✅ All accessibility tests currently pass with 0 violations across all views.

## Development Memories and Notes

- **Commit Workflow Reminder**: Please always ask me before making a commit
- **Accessibility Compliance**: All new features must maintain WCAG 2.1 AA standards