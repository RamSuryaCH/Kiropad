## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2026-06-22 - Dynamic Button States and OTP Formatting for Screen Readers
**Learning:** When a button's `textContent` updates dynamically (e.g., "New Code" to "Generating..."), a static `aria-label` will continue to override the visible text, causing screen readers to announce stale information. Furthermore, standard screen readers read unspaced OTP/pairing code strings as a single large number or gibberish word instead of individual digits, which is critical for accurate code entry.
**Action:** Ensure dynamic `aria-label` updates occur synchronously alongside `textContent` changes in JavaScript. For OTP or pairing code containers, apply `aria-hidden="true"` to individual digit elements, wrap them in a container with `role="group"`, and set an `aria-label` with the code string formatted with spaces (e.g., "P a i r i n g   c o d e :   1   2   3").
