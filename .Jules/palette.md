## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2024-05-24 - ARIA Live for Pairing Codes
**Learning:** Screen readers read individual dynamic digits disjointedly.
**Action:** Use aria-hidden on individual digits and update a space-separated string on the parent aria-live container.
