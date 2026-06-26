## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2026-06-26 - Accessibility for dynamically updated disjointed digits
**Learning:** Screen readers read individual dynamic digits disjointedly. When implementing digit displays (e.g., OTPs or pairing codes), updating a space-separated string on the parent `aria-live` container while hiding the individual digits ensures cohesive screen reader announcements.
**Action:** Use `aria-hidden="true"` on individual digits alongside updating a space-separated string on the parent `aria-live` container.
