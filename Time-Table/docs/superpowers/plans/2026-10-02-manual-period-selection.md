# Manual Period Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users manually select fixed Lab, Placement, Library, and extracurricular periods, validate those selections, and automatically schedule only the remaining theory periods.

**Architecture:** Extend the existing per-class external-allotment model with explicit reservation metadata instead of creating a parallel scheduling system. Add a small JavaScript reservation-validation module for UI and browser scheduling, mirror its rules in the Python parser/validator, and make both schedulers reserve validated manual cells before placing theory subjects. Setup controls and grid editing both update the same reservation data.

**Tech Stack:** Vanilla ES modules, Node built-in test runner, Python 3.11 dataclasses/unittest, Flask, existing HTML templates and CSS.

**Spec:** `Time-Table/docs/superpowers/specs/2026-10-02-manual-period-selection-design.md`

## Global Constraints

- Labs must be manually selected as one same-day consecutive block.
- A Lab block must be entirely before lunch or entirely after lunch.
- Placement and Library must be manually selected as either one same-day consecutive block or separate individually selected periods.
- Placement and Library are independent categories and must not use extracurricular placement rules.
- Manual reservations are fixed and automatic scheduling may only use remaining teaching slots.
- Invalid or incomplete manual selections must block generation with an explicit diagnostic.
- Existing tests and existing timetable behavior must remain green.

## Review Focus

- A Lab selection that crosses lunch or a break must be rejected rather than split or silently shortened; covered by Task 1 JavaScript and Task 3 Python validation tests.
- A separate Placement/Library selection with duplicate cells or the wrong number of periods must not pass validation; covered by Task 1 and Task 3 validation tests.
- Regenerating one class must preserve that class's manual cells and leave other classes unchanged; covered by Task 2 scheduler tests.
- A manually reserved teacher slot must not create an automatic theory collision; covered by Task 2 and Task 4 scheduler tests.
- A reservation using a non-default template or non-numeric period identifiers must be validated against the class template rather than hardcoded eight-period assumptions; covered by Task 1 and Task 3 template tests.

---

### Task 1: Shared reservation model and browser validation

**Files:**
- Create: `Time-Table/src/manual-periods.js`
- Modify: `Time-Table/src/data-model.js`
- Test: `Time-Table/tests/data-model.test.js`
- Test: `Time-Table/tests/scheduler.test.js`

**Interfaces:**
- Produces `normalizeManualReservations(rawReservations, template, subjects) -> { reservations, errors }`.
- Produces `validateManualReservation(reservation, subject, template, occupied) -> string[]`.
- Reservation shape is `{ subjectId, kind, day, periodNumbers, mode, session?, staffId? }`.
- `kind` values are `LAB`, `PLACEMENT`, `LIBRARY`, `EXTRACURRICULAR`; `mode` values are `continuous`, `separate`.

- [ ] **Step 1: Write failing tests** for exact-count validation, Lab continuity, lunch-boundary enforcement, continuous Placement/Library blocks, separate selections, duplicate cells, break/lunch cells, and template-specific period validation.
- [ ] **Step 2: Run the focused tests** with `npm test -- --test-name-pattern="manual|reservation|lab|placement|library"`; expected: failures for missing reservation normalization/validation exports.
- [ ] **Step 3: Implement** the reservation normalization and validation helpers. Use the template's period metadata to identify teaching periods and lunch boundaries; never assume fixed period numbers beyond the supplied template.
- [ ] **Step 4: Normalize workbook-derived Lab, Placement, Library, and extracurricular fields** into class-scoped reservation data without changing existing theory subject identities.
- [ ] **Step 5: Run the focused tests**; expected: all new tests pass.
- [ ] **Step 6: Commit** with `git add Time-Table/src/manual-periods.js Time-Table/src/data-model.js Time-Table/tests/data-model.test.js Time-Table/tests/scheduler.test.js && git commit -m "feat: validate manual period reservations"`.

### Task 2: Browser scheduler and both UI selection paths

**Files:**
- Modify: `Time-Table/src/scheduler.js`
- Modify: `Time-Table/src/app.js`
- Modify: `Time-Table/src/ui.js`
- Modify: `Time-Table/src/styles.css`
- Modify: `Time-Table/tests/scheduler.test.js`
- Modify: `Time-Table/tests/ui.test.js`
- Modify: `Time-Table/tests/integration.test.js`

**Interfaces:**
- Consumes Task 1's normalized `model.manualReservations` and validation helpers.
- Produces schedules whose reserved cells retain `{ subjectId, teacher, kind, manual: true }` metadata.
- `generateTimetable(model)` and `regenerateClassTimetable(model, previousResult, className)` must preserve valid manual cells and report invalid reservations in diagnostics.

- [ ] **Step 1: Write failing scheduler tests** proving valid manual Lab/Placement/Library cells are reserved, theory uses only remaining cells, regeneration preserves reservations, and Placement/Library do not enter extracurricular fallback logic.
- [ ] **Step 2: Run the focused scheduler/integration tests**; expected: failures because the current scheduler auto-places or ignores these reservations.
- [ ] **Step 3: Implement reservation-first scheduling** in `scheduler.js`: validate and reserve manual cells, exclude them from candidate pools, emit their category metadata, and keep manual reservations unchanged during selected-class regeneration.
- [ ] **Step 4: Write failing UI tests** for setup editors, Lab before/after-lunch controls, continuous/separate Placement and Library controls, and grid manual-mode selection/removal.
- [ ] **Step 5: Implement setup and grid editing** in `ui.js`/`app.js`. Both paths must mutate the same reservation array, show validation errors immediately, and prevent saving an invalid selection.
- [ ] **Step 6: Add styles and visual distinctions** for manual Lab, Placement, Library, and extracurricular cells while preserving existing class/teacher/lab views.
- [ ] **Step 7: Run the focused JavaScript suite**; expected: all new and existing browser tests pass.
- [ ] **Step 8: Commit** with `git add Time-Table/src Time-Table/tests && git commit -m "feat: add manual period selection to browser scheduler"`.

### Task 3: Python input model and independent reservation validation

**Files:**
- Modify: `Time-Table/backend/timetable/models.py`
- Modify: `Time-Table/backend/timetable/input.py`
- Modify: `Time-Table/backend/timetable/validation.py`
- Modify: `Time-Table/backend/tests/test_scheduler.py`

**Interfaces:**
- Extends `ExternalAllotment` with optional `mode`, `session`, and `manual` fields while preserving existing JSON inputs.
- `parse_dataset()` rejects invalid manual reservations through `InputError` with class, subject, and rule context.
- `validate_output()` treats manual reservation violations as explicit rule records.

- [ ] **Step 1: Write failing Python tests** for Lab session boundaries, continuous/separate Placement and Library, duplicate/wrong-count selections, template-specific periods, and backward-compatible legacy allotments.
- [ ] **Step 2: Run `python -m unittest backend.tests.test_scheduler`**; expected: new validation tests fail.
- [ ] **Step 3: Extend the dataclasses and parser** to preserve reservation metadata and validate exact counts, teaching-period membership, continuity, lunch boundaries, and category-specific modes.
- [ ] **Step 4: Implement independent output validation** so generated schedules cannot claim `complete` when a manual reservation was lost, moved, or overlapped.
- [ ] **Step 5: Run the focused Python tests**; expected: all new tests pass.
- [ ] **Step 6: Commit** with `git add Time-Table/backend/timetable Time-Table/backend/tests/test_scheduler.py && git commit -m "feat: validate manual reservations in backend"`.

### Task 4: Python scheduler and Flask mapping parity

**Files:**
- Modify: `Time-Table/backend/timetable/scheduler.py`
- Modify: `Time-Table/frontend/mapping.py`
- Modify: `Time-Table/frontend/app.py`
- Modify: `Time-Table/frontend/templates/index.html`
- Modify: `Time-Table/frontend/static/app.js`
- Modify: `Time-Table/backend/tests/test_scheduler.py`
- Modify: `Time-Table/frontend/tests/test_app.py`

**Interfaces:**
- Consumes Task 3's parsed `ExternalAllotment` metadata.
- Produces serialized `EXTERNAL` slots with the original category and manual metadata, and schedules theory only in unreserved slots.
- Flask form mapping accepts manual reservation rows for Lab, Placement, Library, and extracurricular subjects.

- [ ] **Step 1: Write failing backend/frontend tests** proving manual reservations survive generation, teacher occupancy is respected, separate Placement/Library cells remain separate, and Flask mapping emits the expected allotments.
- [ ] **Step 2: Run the focused Python tests**; expected: failures because `_schedule_class()` currently treats only existing allotments and does not enforce the new metadata consistently.
- [ ] **Step 3: Update the backend scheduler** to pre-seed manual slot occupancy, leave reserved cells fixed, and schedule theory around them without applying extracurricular rules to Placement or Library.
- [ ] **Step 4: Update Flask mapping/forms** to accept the same reservation schema and expose the category/mode/session controls needed by non-browser API users.
- [ ] **Step 5: Run focused Python tests**; expected: all new backend and Flask tests pass.
- [ ] **Step 6: Commit** with `git add Time-Table/backend Time-Table/frontend && git commit -m "feat: schedule around manual external periods"`.

### Task 5: Full verification, documentation, and review

**Files:**
- Modify: `Time-Table/README.md`
- Modify: `Time-Table/timetable-generator-spec.md`
- Modify: `Time-Table/tests/*.test.js` only if integration coverage needs final fixtures
- Modify: `Time-Table/backend/tests/test_scheduler.py` only if final cross-path fixtures need completion

- [ ] **Step 1: Add documentation** explaining setup controls, grid manual mode, Lab before/after-lunch selection, and Placement/Library continuous versus separate selection.
- [ ] **Step 2: Run the complete JavaScript suite** with `npm test`; expected: all tests pass.
- [ ] **Step 3: Run the complete Python suite** with `python -m unittest discover -s backend/tests`; expected: all tests pass.
- [ ] **Step 4: Run the build** with `npm run build`; expected: the browser bundle/build output completes successfully.
- [ ] **Step 5: Inspect the final diff and status**; expected: only the planned files are modified, no generated secrets or unrelated changes appear.
- [ ] **Step 6: Commit documentation and final fixtures** with `git add Time-Table/README.md Time-Table/timetable-generator-spec.md Time-Table/tests Time-Table/backend/tests && git commit -m "docs: describe manual period selection"`.

