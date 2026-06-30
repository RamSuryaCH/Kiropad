## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.

## 2024-10-24 - Cohesive Screen Reader Announcements for OTP Digits
**Learning:** Screen readers read individual dynamic digits disjointedly when split into separate elements. Generic elements with aria-label are ignored without semantic roles.
**Action:** Use a visually hidden (.sr-only) text node inside an aria-live container to announce space-separated digits cohesively, while hiding visual digits with aria-hidden="true".
