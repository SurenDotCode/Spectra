# Spectra design system

Primary theme: dark violet glass. Reference image guides materials and mood only. No reference brands, testimonials, statistics, pricing or mockups are reused.

## Tokens

`src/app/theme.css` is the palette source. `globals.css` consumes it; component colors are not hardcoded. The favicon is a standalone local vector asset.

| Role                                    | Dark theme                              |
| --------------------------------------- | --------------------------------------- |
| Canvas / raised canvas                  | #080711 / #100D1D                       |
| Violet / deep / soft                    | #8B5CF6 / #6D3BFF / #B66DFF             |
| Atmospheric accents                     | #D946EF magenta, #F5B85A amber          |
| Primary / secondary / tertiary text     | #F3F0FA / #B9B2CA / #A39AB6             |
| Glass / raised glass                    | rgba(25,20,42,.84) / rgba(40,31,62,.88) |
| Verified / Inferred / Unknown / Concern | #A1DFC2 / #E9CC98 / #C3BDCF / #F2B0BD   |
| Radius                                  | 10, 14, 20, 28, 999px                   |
| Spacing                                 | 4, 8, 12, 16, 24, 32, 48, 64, 96px      |
| Motion                                  | 200ms; easing cubic-bezier(.2,.7,.3,1)  |
| Glass blur                              | 20px                                    |

System fonts: Avenir Next, Segoe UI, Arial, sans-serif. No remote fonts, scripts, images or new dependencies. Headlines use regular weight, tight tracking and balanced wrapping. UI numbers are tabular. Body copy uses 1.5 line height.

The optional light theme has a pale lavender canvas, dark plum text, white glass, darker semantic colors and a dark primary action. Existing theme controls and persistence behavior are unchanged.

## Materials and components

- Static violet light behind content; faint magenta on the right and amber on one edge. No animated decoration.
- Glass uses a dark tint, hairline border, brighter top edge and violet shadow. Blur is reserved for the session, auth and hero surfaces. Scrolling prospect rows remain tinted, unblurred surfaces. No more than two glass layers.
- Pill actions have 44px minimum targets, explicit focus rings, disabled states, and restrained hover movement. White primary action on dark; quiet outlined secondary actions.
- Voice uses the existing Lucide icons and actual microphone waveform. Recording and processing styles reflect existing state flags. No simulated transcription or activity.
- Session is one column. Transcript comes first, recorder second, preferences next, editable confirmation last.
- Prospect rows retain stable order. Existing focus selection reveals evidence; the focused row has a violet edge. The conversation sits beside the list on wide screens and below on narrow screens.
- Source links, evidence labels, unknowns, contact provenance and dates remain available. Evidence content is never shortened by copy cleanup.
- Research uses four slim timeline stages with actual completed and failed counts. Retry/pause behavior is unchanged.
- Usage meters display the existing per-feature limits from the unchanged migration. They are presentation only; server enforcement remains authoritative. Global limits can still prevent a request before a personal meter fills.

## Accessibility and performance

Visible labels, native controls, keyboard focus, semantic headings, skip link and text equivalents are retained. Spoken answers remain visible as text; Stop speaking is available beside Listen. No new keyboard shortcuts are advertised.

Reduced motion disables decorative transitions and smooth scrolling. Reduced transparency and unsupported blur use opaque token surfaces. No will-change layers, canvas decorations or external assets are added. The recording canvas is the existing input-driven waveform.

`/design` is a static development showcase and calls `notFound()` outside development. Production never exposes it as a demo.

## Behavior intentionally outside scope

Hold-Space recording, streaming transcription, voice commands for profile edits, automatic speech interruption and a new landing recording flow require behavior changes. They are excluded by the scope lock. The landing Talk action opens the existing recording workspace.

See FRONTEND_AUDIT.md for verification and COPY.md for the screen-by-screen copy inventory.
