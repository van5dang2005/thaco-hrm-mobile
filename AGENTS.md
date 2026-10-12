This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in the root `app/` folder (there is deliberately no `src/app/`, which would take precedence) — every file there is a screen, `_layout.tsx` files define navigators. Keep route files thin; screens and logic live in `src/features/*`, shared UI in `src/shared/ui`, infrastructure in `src/core`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.config.ts` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Project notes

- Two back-ends, two token sets: `src/core/api/clients.ts` (`parcelApi`, `roomApi`). Never mix user ids between them; each service has its own `users/me`.
- Enums are numeric on the wire; use the TS enums in `src/features/*/types.ts`. Times are UTC on the wire and shown in Vietnam time via `src/core/time/vn.ts`.
- Every server error carries `errorCode`; map it with `errorMessage()` (`src/core/errors`). Add new codes to both locale files.
- UI strings live in `src/core/i18n/locales/{vi,en}.ts` only.
- App config is `app.config.ts` (there is no `app.json`). Env vars live on expo.dev (EAS environment variables); locally there is a single git-ignored `.env`, written by `npm run env:pull[:preview|:prod]`. EAS builds read the profile's `environment` from `eas.json`, never the local `.env`. `APP_ENV` picks the app name suffix.
- Pinned to Expo SDK 55 because SDK 57 needs Xcode ≥ 26.4. The universal `@expo/ui` layer (and the `expo-ui` skill's universal examples) needs SDK 56+, so on SDK 55 only `@expo/ui/swift-ui` and `@expo/ui/jetpack-compose` exist.
- Icons: lucide (`lucide-react-native`), imported only through `src/shared/ui/icons.ts`, one `lucide-react-native/icons/<name>` file per icon, and rendered with `<Icon>` (stroke 1.8, `bold` 2.2). Never import from the `lucide-react-native` or `@expo-google-fonts/*` package roots: Metro would bundle every icon / weight.
- UI is the v3 design (`../design_handoff_thaco_hrm_mobile/PROMPT_V3.md`): build module screens from `ModuleScreen` + `ModuleHeader` (+ `FloatingCard`), shadows from `src/shared/ui/shadows.ts`, tones from `src/shared/ui/tones.ts`. The dev gallery `/ui` shows every shared component.
- UI font is fixed to Be Vietnam Pro, JetBrains Mono for codes and numbers (`src/core/theme/fonts.ts`). Render text with `<Text>` / `useFontStyle()`, never a hard-coded `fontFamily`.
