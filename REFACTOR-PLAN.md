# Reels Maker — Full Restructure Plan

## Goal
Turn the current accumulated single-page codebase into a maintainable product architecture without breaking the existing production experience.

## Current issues observed
- Many versioned runtime overlays (`worker-v*`, `route-*`, `mobile-*`, `business-refresh-*`).
- Navigation logic is duplicated across multiple files.
- Desktop/mobile behavior is patched in layers instead of sharing one router/layout system.
- Features inject UI dynamically from different files, which makes ordering and regressions harder to control.
- Worker code mixes API routing, AI generation, TTS, media proxying, HTML injection, and compatibility patches.

## Target architecture

```text
/app
  /core
    router.js
    state.js
    events.js
    bootstrap.js
  /layout
    shell.js
    navigation.js
    mobile.js
  /features
    /home
    /automation
    /video-editor
    /image-studio
    /audio-studio
    /quran-studio
    /projects
    /settings
  /services
    api.js
    ai.js
    media.js
    tts.js
  /styles
    tokens.css
    base.css
    layout.css
    components.css
    mobile.css
/worker
  index.js
  /routes
    ai.js
    tts.js
    media.js
    automation.js
  /lib
    response.js
    validation.js
    providers.js
```

## Navigation target
1. الصفحة الرئيسية
2. المحتوى التلقائي
3. استوديو القرآن
4. محرر الفيديو
5. استوديو الصور
6. نص → صوت
7. النصوص
8. العناصر والملصقات
9. الطبقات
10. الإعدادات

## Refactor rules
- Keep `main` untouched until the new structure is stable.
- Continue work only on `autocontent-integration` during migration.
- Preserve existing public APIs while moving their implementation behind clean route modules.
- No captions/text are burned into auto-generated media unless explicitly enabled later.
- Mobile and desktop share one routing source of truth.
- Replace versioned patch chains gradually instead of deleting them all at once.

## Migration phases
### Phase 1 — Foundation
- Add core router/state/event modules.
- Add design tokens and normalized shell styles.
- Register `automation` as a first-class route instead of a DOM patch.

### Phase 2 — Navigation and shell
- Replace duplicated navigation logic with one route table.
- Make mobile drawer and desktop sidebar use the same config.
- Normalize open/close behavior for studios.

### Phase 3 — Feature modules
- Move Automation Studio into `/app/features/automation`.
- Move media/audio/image integrations behind service modules.
- Keep the old editor runtime working during migration.

### Phase 4 — Worker cleanup
- Create one Worker entrypoint.
- Split API handlers by route.
- Remove HTML string-patching that is no longer required.

### Phase 5 — Stabilization
- Remove superseded `worker-v*`, `route-*`, and old mobile patch files only after functional parity checks.
- Test navigation, mobile layout, TTS, media search, editor handoff, export, and error states.
