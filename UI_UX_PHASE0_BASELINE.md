# UI/UX Phase 0 Baseline

## Goal
Lock design direction and define measurable UX acceptance criteria before UI refactor phases.

## Phase 0 Output
- Visual direction frozen (no major style pivot).
- Scope and priority pages agreed.
- UX acceptance checklist documented.
- Sign-off checklist for Phase 1+ ready.

## Design Freeze (Keep As-Is)
- Keep current visual character and layout composition, especially Dashboard structure.
- Keep current brand style (rounded cards, soft borders, muted background, dark/light support).
- Keep language switch interaction model (ID/EN toggle).
- Do not redesign IA/navigation during UX polishing phases.

## Priority Scope
1. `app/components/DashboardView.jsx`
2. `app/admin/page.js`
3. `app/profile/page.js`
4. `app/components/TaskForm.jsx`
5. `app/components/Header.jsx`

## UX Acceptance Checklist (Phase 0 Baseline)

### A. Readability
- Body text target: >= 14px on core content.
- Metadata/support text target: >= 12px.
- Avoid critical info at 9px.
- Uppercase labels only for short section labels, not long helper text.

### B. Accessibility
- Do not block browser zoom for mobile users.
- Interactive controls must have visible focus state.
- Buttons/toggles/links must have clear disabled/loading states.
- Color contrast should remain readable in both light and dark themes.

### C. i18n Consistency
- Every user-facing string in scoped pages must use language switch source.
- No mixed hardcoded EN/ID strings in the same state.
- Error/success copy should use consistent tone per language.

### D. Feedback & States
- Form validation should show inline feedback for critical fields.
- Toast is supplementary, not the only source of validation feedback.
- Empty/loading/error states should explain next action.

### E. Mobile UX
- Primary actions reachable and visible on small screens.
- Input controls remain readable and tappable.
- Dense cards/rows preserve hierarchy without tiny labels.

## Non-Goals (Not in UX Phases)
- No feature additions.
- No backend/business logic changes unless required for UX state messaging.
- No large layout overhaul on Dashboard composition.

## Phase 0 Sign-Off
- [ ] Design freeze accepted
- [ ] Scope pages accepted
- [ ] UX checklist accepted
- [ ] Ready to execute Phase 1 (Accessibility & Readability)

