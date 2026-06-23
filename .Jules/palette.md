## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2024-06-23 - Screen reader accessibility for pairing codes and dynamic buttons
**Learning:** When displaying split codes (like an OTP), formatting the text with spaced strings and adding an explicit aria-label ensures screen readers pronounce individual digits rather than a single large number. Additionally, dynamic buttons need their aria-labels synchronized with their text changes.
**Action:** Add aria-label and aria-hidden to code digits and update button aria-labels dynamically alongside their text content.
