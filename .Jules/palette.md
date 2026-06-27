## 2024-06-21 - Added accessibility to UI Buttons
**Learning:** The application index.html lacked ARIA labels on buttons and visual focus rings/disabled states which makes it harder for keyboard users to navigate.
**Action:** Adding focus-visible outlining and disabled state opacities along with ARIA labels to button actions.
## 2024-05-24 - Screen Reader Compatibility for OTP Codes
**Learning:** Screen readers read individual dynamic digits disjointedly when they are updated in the DOM. Using an 'aria-live' container with a spaced string 'aria-label' provides cohesive announcements, while individual visual digits need 'aria-hidden' to prevent double reading.
**Action:** Apply 'aria-live="polite"' on the parent container, format digits as spaced strings in its 'aria-label', and hide individual digits with 'aria-hidden="true"'.
