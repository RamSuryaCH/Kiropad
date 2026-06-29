## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.
## 2026-06-29 - Pairing Code Accessibility
**Learning:** Dynamically updated digit displays must be hidden with aria-hidden='true' and narrated via a space-separated string in an aria-live container to avoid disjointed screen reader narration.
**Action:** Use aria-hidden on digits and a spaced aria-label on the parent container.
## 2026-06-29 - Pairing Code Accessibility Live Region Fix
**Learning:** aria-live regions announce DOM text node changes, not attribute changes like aria-label. Generic div elements also ignore aria-label without a valid role. Dynamically updated digit displays must use a visually hidden screen-reader-only element inside a status/live region to announce changes.
**Action:** Use a visually hidden span for screen readers alongside aria-hidden true visual elements.
