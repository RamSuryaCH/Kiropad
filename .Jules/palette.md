## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2024-06-21 - Format OTP/Pairing Codes for Screen Readers
**Learning:** OTP or pairing codes formatted as single unbroken strings are read continuously by screen readers, which is confusing. Formatting them as spaced strings (e.g., "1 2 3 4 5 6") ensures they are announced as individual digits. Furthermore, we must add `aria-live="polite"` so screen readers speak out the change when it updates.
**Action:** When working with OTP or pairing codes, set an `aria-label` where the characters are separated by spaces, and use `aria-live` on dynamically updating containers to ensure the new code is properly announced.
