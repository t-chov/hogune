# Hogune Design Document

- Status: Draft for implementation
- Version: 0.2
- Updated: 2026-09-14
- Product name: **Hogune（ホグネ）**
- Target: Personal use, recent iPhone and Android devices

## 1. Summary

Hogune is a mobile-first web application for performing a predefined sequence of stretches. A routine is encoded entirely in its URL, so the first release requires no user account, database, API, or server-side application logic.

Exercise images are not generated, bundled, fetched, or displayed: generated stretch illustrations could not achieve consistent instructional quality. Pre-generated VOICEVOX audio provides each exercise's name and movement instructions. Text instructions and large timers supplement the audio. Countdown and transition sounds are synthesized in the browser. Background music is outside the scope of the application.

The application is delivered as a static Progressive Web App (PWA) on Cloudflare Workers Static Assets.

## 2. Goals

1. Let the user open a routine URL and start stretching with one tap.
2. Keep operation and hosting maintenance close to zero.
3. Work reliably on recent iPhone and Android browsers.
4. Require no login and store no personal data on a server.
5. Make a routine URL deterministic and shareable.
6. Support offline reuse after the routine's assets have been cached.
7. Make adding exercises a repository-only operation in the first release.
8. Let users follow every exercise through spoken instructions and clearly distinguishable countdown/start/end cues without continually watching the screen.

## 3. Non-goals

The first release does not include:

- User registration, authentication, or synchronization.
- A database or server-side API.
- An in-app exercise editor or routine builder.
- Usage analytics, telemetry, advertisements, or social features.
- Background music.
- Runtime speech synthesis.
- Exercise images, thumbnails, videos, and image generation (offline or runtime).
- Medical diagnosis, treatment recommendations, or personalized health advice.
- Guaranteed execution while the browser is backgrounded or the device is locked.

## 4. Product assumptions

- Anyone who knows the application URL may access it.
- Exercise definitions and media assets are public static files.
- The primary orientation is portrait, but landscape must remain usable.
- The application targets the latest two major versions of iOS Safari and Android Chrome at release time.
- A routine contains 1–100 exercises.
- One exercise may appear multiple times in a routine.
- Exercise duration is common to every exercise in a routine.
- The configured interval is an exact rest duration. Instructions may overlap the next exercise and its countdown.
- Exercise content is manually reviewed before release.

## 5. Recommended technology stack

| Area | Choice |
|---|---|
| Language | TypeScript with strict mode |
| UI | React |
| Build tool | Vite |
| PWA | `vite-plugin-pwa` / Workbox |
| Unit tests | Vitest |
| Component tests | React Testing Library |
| Browser tests | Playwright |
| Formatting/linting | Prettier and ESLint |
| Hosting | Cloudflare Workers Static Assets |
| Source repository | GitHub, private repository permitted |
| CI/CD | Cloudflare Git integration, or GitHub Actions if integration is unavailable |

Do not introduce Next.js, SSR, Cloudflare Functions, Workers runtime code, D1, KV, R2, or another backend service unless a future requirement needs them.

## 6. High-level architecture

```text
Routine URL
   │
   ▼
URL decoder ──► validated Routine
                     │
                     ▼
Exercise manifest ─► Session scheduler/state machine
       │                     │
       └── voice.mp3         ├── UI state / instruction text
                             ├── VOICEVOX playback
                             └── Web Audio cue synthesis
```

All application code, the exercise manifest, and speech files are compiled or copied into the static deployment.

## 7. Routine URL format

### 7.1 Canonical form

```text
https://<host>/#/v1/<exerciseSeconds>/<intervalSeconds>/<exerciseIds>
```

Example:

```text
https://<host>/#/v1/30/5/00A00B00C
```

Interpretation:

- Format version: `v1`
- Exercise duration: 30 seconds
- Interval duration: 5 seconds (fixed, independent of speech duration)
- Exercises: `00A`, `00B`, `00C`

The hash fragment is used so routine data is not sent as part of the HTTP request and static hosting requires no route fallback.

### 7.2 Exercise identifiers

- Each exercise ID is exactly three uppercase hexadecimal characters.
- Valid range: `000`–`FFF`.
- Capacity: 4,096 exercise definitions.
- IDs are permanent once published and must never be reassigned to a different exercise.
- Deleted exercises remain reserved. Their manifest entry may be marked deprecated but must not silently change meaning.

### 7.3 Validation rules

| Field | Rule |
|---|---|
| Version | Must equal `v1` |
| Exercise seconds | Base-10 integer from 5 to 600 |
| Interval seconds | Base-10 integer from 0 to 120 |
| Exercise ID string | Uppercase hexadecimal; length divisible by 3 |
| Exercise count | 1–100 |
| Exercise existence | Every ID must exist and be enabled in the manifest |

The decoder may accept lowercase hexadecimal input but must canonicalize it to uppercase when copying or generating a URL. Decimal fields must be canonicalized without leading zeros.

An invalid URL must show a human-readable error and must not begin a session. The UI should identify unknown exercise IDs when possible.

### 7.4 Terminology

The complete encoded value is called a **routine recipe**. It is not a database key. A future routine builder generates URLs by serializing a recipe; it does not “issue” or store an opaque ID.

## 8. Exercise data model

Store the source manifest at `src/data/exercises.ts` or generate it from a checked-in JSON file.

```ts
export type Exercise = {
  id: string;                 // Three uppercase hexadecimal characters
  nameJa: string;             // Display name
  instructionJa: string;      // Required movement instructions, also displayed
  voiceTextJa: string;        // Exact spoken transcript: name and instructions
  voiceSrc: string;           // Pre-generated VOICEVOX MP3 path
  voiceDurationMs: number;    // Measured during asset preparation
  enabled: boolean;
  deprecated?: boolean;
  review: {
    instructionReviewed: boolean;
    audioReviewed: boolean;
    reviewedAt: string;       // YYYY-MM-DD
    reviewer: string;
  };
  provenance: {
    voiceGenerator: "VOICEVOX";
    voiceCharacter: "四国めたん";
    voiceStyle?: string;
  };
};
```

Recommended asset layout:

```text
public/
  exercises/
    00A/
      voice.mp3
    00B/
      voice.mp3
```

Build validation must fail when:

- IDs are duplicated or malformed.
- An enabled exercise references a missing asset.
- An enabled exercise has not passed instruction and listening review.
- Required name, movement instructions, or voice transcript is blank.
- Voice duration is not positive and finite.
- The measured voice duration differs materially from the manifest value.
- An asset exceeds the configured size budget.

## 9. Session model

### 9.1 States

```ts
type SessionState =
  | "loading"
  | "invalid"
  | "ready"
  | "preparing"
  | "exercising"
  | "interval"
  | "paused"
  | "complete";
```

State transitions:

```text
loading ──► invalid
   │
   └──► ready ──► preparing ──► exercising
                                      │
                                      ├──► interval ──► exercising
                                      │
                                      └──► complete

preparing / exercising / interval ──► paused ──► previous active state
```

### 9.2 Session timing

- Use an absolute monotonic timeline based on `AudioContext.currentTime`, with `performance.now()` as a fallback/reference.
- Do not decrement the authoritative remaining time with `setInterval`.
- UI updates may use `requestAnimationFrame` while visible.
- Audio events should be scheduled slightly ahead through Web Audio to reduce drift.
- Recompute the visible phase and remaining time from the timeline after delays.
- Prevent duplicate cue playback by assigning each scheduled event a stable event ID.

### 9.3 Background behavior

Mobile browsers do not guarantee reliable timers or audio in the background. For predictable behavior:

- Request Screen Wake Lock after the user presses Start when supported.
- Release it on pause, completion, and page unload.
- Reacquire it after the page becomes visible if the session is active.
- Automatically pause when the document becomes hidden.
- Show a clear Resume screen when the user returns.
- Do not claim lock-screen/background operation.

### 9.4 Start sequence

1. User opens a valid routine URL.
2. Application validates the recipe and resolves every exercise.
3. Application loads all routine speech files; no exercise images are requested.
4. The Ready screen shows total duration and exercise count.
5. User presses the primary Start button.
6. In that user gesture, initialize/resume `AudioContext` and request Wake Lock.
7. Play the first exercise's full name and movement instructions; wait for the measured speech duration plus 250 ms.
8. Run the three-second start countdown.
9. Play the start cue and enter `exercising`.

### 9.5 Exercise and transition sequence

For each exercise:

1. Display its name, movement instructions, ordinal position, and large remaining time.
2. During the final three seconds, play one countdown tick per second.
3. At zero, play the exercise-end cue, or the completion cue for the last exercise (never both together).
4. If this is the last exercise, enter `complete`.
5. Otherwise enter the interval, wait 500 ms for the end cue to finish, and play the next exercise's full spoken instructions.
6. During the final three seconds before the next exercise, play the start countdown.
7. At zero, play the start cue and enter the next exercise.

Only the first instruction must finish at least 250 ms before its three-second start countdown. Later instructions begin 500 ms after the preceding exercise ends and may continue across the next countdown and exercise start.

- Initial preparation: `voiceDurationMs + 250 + 3000` ms.
- Every transition: exactly `intervalSeconds * 1000` ms.
- Rest shorter than three seconds only includes the countdown ticks that fit; zero rest starts the next hold immediately without start-countdown ticks.
- Events are sorted by time, including instructions scheduled after a zero-rest start. Announcements do not change an already-active hold back to interval state.
- Exercise hold durations remain exactly as encoded in the URL.
- The Ready screen includes initial preparation, holds and exact intervals in its estimate.
- An instruction continues through exercise start; it is stopped if superseded by another instruction or at session completion. At a zero-rest boundary the start cue replaces the end cue.

The v1 URL syntax, valid ranges, and IDs remain unchanged.

### 9.6 Pause, resume, and quit

- A large Pause control must be available during the session.
- Pausing freezes the routine timeline and cancels unsounded scheduled audio.
- Resuming begins with a new three-second countdown before continuing the remaining phase. If paused during speech, replay that instruction from the beginning. Initial preparation retains the speech gap and countdown. During holds and subsequent intervals, replay may overlap the countdown and resumed hold; speech length does not extend the interval.
- “End session” requires a lightweight confirmation to prevent accidental taps.
- Browser reload restarts at Ready in v1; mid-session persistence is not required.

## 10. Audio design

### 10.1 Speech

- Generate speech offline with the desktop/local VOICEVOX application.
- Character: 四国めたん.
- Phrase pattern: `次は、{exercise.nameJa}。{exercise.instructionJa}`; store the exact spoken transcript in `voiceTextJa`.
- Describe the starting position, movement, side when relevant, and essential form cues clearly enough to follow without an image.
- Have a human review the instructions and listen to the rendered speech before enabling an exercise.
- Use one pre-generated MP3 per exercise.
- Normalize perceived loudness consistently across files.
- Do not deploy VOICEVOX Engine or synthesize speech at runtime.

### 10.2 Countdown and transition cues

Generate all non-speech cues with Web Audio oscillators. Do not ship third-party sound-effect recordings.

Suggested auditory language:

- Countdown tick: short, neutral sine/triangle tone.
- Start cue: brighter two-note ascending tone.
- End cue: distinct two-note descending tone.
- Completion cue: short three-note resolution.

Exact frequencies and envelopes are implementation details, but start and end cues must be unmistakably different. Cues must finish within 400 ms, leaving a gap before speech starts 500 ms after a transition. Provide an explicit sound-check button that plays countdown, start, end, and completion cues before a session. Provide a mute/unmute control and remember the choice in local storage. Visual countdowns must remain sufficient when muted.

### 10.3 Mobile restrictions

- Audio initialization must occur in the Start button gesture.
- Pre-decode or preload the immediately required sounds before the countdown.
- Test behavior with the iPhone silent-mode switch and Android media volume. Do not promise audible cues when the operating system or browser suppresses them.

## 11. Instruction content requirements

- Do not create, ship, display, or cache exercise illustrations or thumbnails. PWA application icons remain in scope.
- Each exercise requires written movement instructions and an exact transcript of the spoken guidance.
- Instructions must be understandable without visual pose references; do not use phrases such as “as pictured.”
- A human must review movement clarity and listen for pronunciation, pacing, clipping, and intelligibility before setting `instructionReviewed` and `audioReviewed` to true.
- Store the review date, reviewer, VOICEVOX provenance, and measured duration with each exercise.
- Placeholder instructions remain disabled until reviewed audio exists.

## 12. Mobile UI specification

### 12.1 General

- Mobile-first layout with a single main column.
- Respect iOS safe-area insets.
- Minimum interactive target size: 44 × 44 CSS pixels; prefer 48 × 48.
- Use high contrast and large numerals visible at arm's length.
- Do not communicate state by color or sound alone.
- Support browser text scaling without clipping essential controls.

### 12.2 Ready screen

Display:

- Hogune wordmark.
- Exercise count.
- Per-exercise and interval durations.
- Estimated total duration.
- Ordered exercise names and text instructions; no thumbnails.
- Audio status, sound-check button, and mute control.
- Offline asset readiness/progress.
- Large Start button fixed near the bottom safe area.

### 12.3 Exercise screen

Display:

- Large countdown and text instructions occupying the main content area; no exercise image.
- Exercise name.
- Large remaining-seconds display.
- Progress such as `2 / 8`.
- A visual progress ring or bar.
- Next exercise name in a secondary position.
- Pause control.

During the final three seconds, the remaining number becomes the dominant visual element.

### 12.4 Interval screen

Display:

- `休憩` label.
- Large remaining-seconds display.
- Next exercise name and full text instruction.
- Indication that spoken instructions and preparation are included in the displayed remaining time.
- Pause control.

### 12.5 Completion screen

Display:

- Completion message.
- Completed exercise count and elapsed active time.
- “もう一度” button.
- “URLをコピー” button.
- No account, streak, or server history UI in v1.

## 13. Local storage

Use a namespaced, versioned key such as `hogune:v1:preferences`.

Allowed values:

```ts
type Preferences = {
  muted: boolean;
  reducedMotion?: boolean;
};
```

Do not store health information, session history, the current routine, or identifiers. Handle unavailable/corrupted local storage by falling back to defaults.

## 14. PWA and offline behavior

- Provide a web app manifest, icons, theme color, and standalone display mode.
- Precache the application shell, exercise manifest, PWA icons, and local font assets if any.
- Runtime-cache exercise speech using versioned/content-hashed MP3 URLs; never reuse an audio URL for changed content. The initial prototype uses reserved voice paths only for disabled entries.
- Before enabling Start, prefetch all speech assets for the current routine.
- Show progress while fetching.
- If fetching fails, list the unavailable assets and offer Retry.
- Once all routine assets are cached, show `オフラインで利用できます`.
- A previously uncached routine is not required to start while offline.
- Service Worker updates must not interrupt an active session. Apply an update on the next reload or after completion.

## 15. Accessibility and motion

- Use semantic buttons, headings, and live regions conservatively.
- Display Japanese movement instructions and provide access to the exact spoken transcript; sound must not be the only source of instructions.
- Keep timer announcements from screen readers from firing every second; announce major transitions instead.
- Honor `prefers-reduced-motion`.
- Animations must not be necessary to understand progress.
- Optional vibration may be used where supported, but must be progressive enhancement only.

## 16. Privacy and security

- Make no runtime requests to third-party APIs.
- Include no analytics or tracking pixels.
- Keep routine data in the URL hash.
- Apply a restrictive Content Security Policy compatible with the final Vite bundle.
- Use `Referrer-Policy: no-referrer`.
- Use `X-Content-Type-Options: nosniff`.
- Validate and bound every parsed URL value before allocating arrays or loading assets.
- Render exercise text as text, never unsanitized HTML.
- Do not imply that an unguessable routine URL is access control.

## 17. Licensing and notices

### 17.1 Required in-app credit

Add an accessible “クレジット” or “このアプリについて” screen containing:

```text
音声：VOICEVOX:四国めたん
```

Reference terms:

- VOICEVOX software terms: https://voicevox.hiroshiba.jp/term/
- 四国めたん audio terms: https://www.zunko.jp/con_ongen_kiyaku.html

### 17.2 Repository records

Maintain `THIRD_PARTY_NOTICES.md` with:

- VOICEVOX and 四国めたん credit and links.
- VOICEVOX generation version, voice style, exact transcript, and audio review records.
- Any third-party fonts, icons, or libraries requiring attribution.

Maintain asset-generation records under a repository directory such as `assets-source/metadata/`. Generated source files need not be shipped to production.

### 17.3 Excluded media

- No BGM is bundled.
- Countdown and transition sounds are generated by application code.
- No third-party sound-effect license is therefore required for v1.

## 18. Repository structure

```text
hogune/
  src/
    app/
    components/
    data/
      exercises.ts
    domain/
      routineCodec.ts
      sessionMachine.ts
      sessionSchedule.ts
    audio/
      audioEngine.ts
      cueSynth.ts
    storage/
      preferences.ts
    styles/
    main.tsx
  public/
    exercises/
    icons/
    _headers
  scripts/
    validate-exercises.ts
    measure-audio.ts
  tests/
    e2e/
  assets-source/
    metadata/
  THIRD_PARTY_NOTICES.md
  README.md
  package.json
  vite.config.ts
  wrangler.jsonc
```

Keep domain code independent of React and browser APIs where possible. Inject a clock and audio adapter into the scheduler so state transitions can be unit-tested deterministically.

## 19. Testing strategy

### 19.1 Unit tests

Cover at minimum:

- Round-trip canonical URL encoding and decoding.
- Lowercase ID canonicalization.
- Every validation boundary and malformed URL case.
- Duplicate exercise IDs in a routine.
- State transitions for one and multiple exercises.
- Intervals of 0, 1, 3, 5, and 120 seconds.
- Exercise durations of 5 and 600 seconds.
- Pause/resume without time loss or duplicate audio.
- Complete instructions before every exercise, including zero/short intervals and long speech.
- Initial preparation duration, exact intervals despite overlapping speech, short-rest countdowns, resume with overlapping speech, and a single completion cue.
- Completion reached exactly once.
- Corrupted local-storage fallback.

### 19.2 Browser tests

Use mobile viewports representative of a recent iPhone and Pixel device. Test:

- A valid URL reaches Ready.
- An invalid URL cannot start.
- Start, pause, resume, complete, and repeat flows.
- Portrait and landscape usability.
- Safe-area layout.
- Asset fetch failure and Retry.
- Offline reload after assets are cached.
- Service Worker update behavior.
- Keyboard and screen-reader semantics where automated checks are useful.

Do not assert exact audio waveform playback in browser tests. Unit-test scheduling calls and perform manual device audio verification.

### 19.3 Manual device checks

Before release, verify on physical iPhone and Android devices:

- Audio unlock after tapping Start.
- Countdown timing and distinguishability.
- iPhone silent mode and media volume behavior.
- Screen Wake Lock behavior.
- Automatic pause when switching apps.
- Home-screen installation and standalone launch.
- Offline reuse.
- Readability at arm's length.

## 20. Performance budgets

- Initial application shell, excluding exercise media: target under 250 KB compressed JavaScript.
- Speech file: target under 150 KB each where intelligibility permits.
- Largest Contentful Paint on a normal modern mobile connection: target under 2.5 seconds for the Ready screen.
- Start must remain disabled until the first phase can run without a network stall.
- Do not load speech for exercises outside the current routine.

## 21. Error handling

Provide dedicated user-facing states for:

- Malformed or unsupported routine URL.
- Unknown or disabled exercise ID.
- Media fetch failure.
- Audio initialization failure.
- Wake Lock unavailable or rejected.
- Offline access to an uncached routine.

Audio or Wake Lock failure should not crash the application. Continue visually after explaining the limitation. Missing exercise media is blocking because it compromises the intended instruction.

## 22. Deployment

Configure a static asset deployment to Cloudflare Workers.

Required deployment properties:

- Production build directory: `dist/`.
- No Worker code or API routes in v1.
- Hashed cache-forever headers for generated JS/CSS/media.
- Short/no-cache policy for `index.html`, the service worker, and exercise manifest.
- HTTPS only.
- Preview deployment on pull requests if using Git integration.
- Production deployment only from the default branch.

Because routine navigation uses a hash fragment, all visits request `/`; no SPA fallback is required for routine URLs.

## 23. Observability and maintenance

The application intentionally has no user analytics. Operational checks are limited to:

- Cloudflare deployment status.
- CI build and test result.
- Optional external uptime check against `/` only, if desired later.

Adding an exercise should require only:

1. Reserve a new three-digit ID.
2. Write and review the movement instructions and spoken transcript.
3. Generate, normalize, and listen to the VOICEVOX file.
4. Record provenance and licenses.
5. Add the manifest entry.
6. Run validation and tests.
7. Merge and deploy.

## 24. Implementation phases

Current implementation (2026-09-14): Audio-led session playback is implemented for five user-generated and user-reviewed VOICEVOX clips (00D–011). Playback includes preload/decode after Start, audio-clock scheduling, pause/resume with interrupted-speech replay, mute, quit confirmation, completion/restart, automatic visibility pause, and optional screen wake lock. The original three reserved placeholders remain disabled. Physical-device audio verification is still pending. VOICEVOX version/style and generation settings remain unreported in metadata. The Ready estimate uses ffprobe measurements; playback uses decoded sample durations for initial preparation and interrupted-speech detection. Subsequent intervals are exact and allow overlapping speech.

### Phase 1: Domain prototype

- Scaffold Vite, React, and TypeScript.
- Implement exercise manifest and URL codec.
- Implement deterministic session state machine and tests.
- Add three placeholder exercises.

### Phase 2: Mobile session UI

- Build Ready, Exercise, Interval, Pause, Error, and Complete screens.
- Add responsive/safe-area styling.
- Add synthesized cues and pre-generated speech playback.
- Add Wake Lock and visibility behavior.

### Phase 3: Assets and PWA

- Add reviewed movement instructions and VOICEVOX audio; record instruction and listening reviews.
- Add asset validation scripts.
- Add service worker, caching, and install manifest.
- Add credits and notices.

### Phase 4: Verification and deployment

- Add Playwright flows.
- Perform physical-device checks.
- Configure security/cache headers.
- Deploy to Cloudflare Workers Static Assets.

## 25. Acceptance criteria for v1

The release is complete when all of the following are true:

1. A canonical URL such as `#/v1/30/5/00A00B00C` loads the correct routine without a backend request.
2. Invalid or unknown recipes show an actionable error and cannot start.
3. A user can start the routine with one tap after assets are ready.
4. No exercise image or thumbnail is generated, loaded, cached, or displayed. Every exercise displays its Japanese name, written instructions, remaining time, and position in the routine.
5. Start and end countdowns are audible and visually distinct.
6. The initial 四国めたん instructions finish before the first countdown. Subsequent intervals stay fixed, with instructions allowed to continue into the next hold.
7. Pause/resume does not lose time, skip a phase, or duplicate audio.
8. Hiding the page pauses the session; returning offers Resume.
9. The current routine works offline after its assets have been cached.
10. The UI is usable in portrait and landscape on the target physical devices.
11. The app contains the visible credit `音声：VOICEVOX:四国めたん`.
12. No account, database, API, analytics, BGM, or runtime AI generation is present.
13. Unit tests, browser tests, linting, type checking, asset validation, and production build all pass.

## 26. Deferred decisions

These do not block v1 implementation:

- Final domain name.
- Final logo and brand colors.
- Exact cue frequencies and animation style.
- A future in-app routine builder.
- Optional local-only favorites or history.
- Multiple durations within one routine.
- A migration format for `v2` URLs.

When a deferred decision is implemented, preserve decoding support for every previously published `v1` URL.
