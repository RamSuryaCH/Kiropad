## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2026-06-28 - Screen Reader Compatibility for OTP
**Learning:** Screen readers read individual dynamic digits disjointedly in OTP displays.
**Action:** Use `aria-hidden="true"` on individual digits and apply a space-separated string to the parent `aria-live` container's `aria-label` to ensure cohesive announcements.
