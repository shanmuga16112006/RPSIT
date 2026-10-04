# Manual Lab, Placement, and Library Period Selection

## Goal

Allow users to manually reserve Lab, Placement, Library, and other extracurricular periods for each class before automatic theory scheduling. Manual reservations must remain fixed during generation and regeneration. Users may configure reservations through setup controls and may also edit them directly from the timetable grid.

## Agreed interaction

Both interaction paths are supported:

1. Dedicated setup controls expose the subject category, required hours, placement mode, day/period selectors, and validation feedback.
2. Timetable-grid manual mode lets the user click cells to add or remove a reservation, using the same underlying model and validation rules as the setup controls.

## Domain model

Each class stores explicit manual reservations. A reservation contains:

- `subjectId`
- `kind`: `LAB`, `PLACEMENT`, `LIBRARY`, or `EXTRACURRICULAR`
- `day`
- `periodNumbers`
- `mode`: `continuous` or `separate`
- `session`: `before_lunch` or `after_lunch` for Lab only
- `staffId` when a fixed instructor is known

Existing fixed-allotment structures are extended rather than replaced. Placement and Library remain separate categories and are not converted into extracurricular subjects.

## Rules

### Lab

- The user must select exactly the required number of lab periods.
- All selected lab periods must be on one day and consecutive in teaching-period order.
- The block must be entirely before lunch or entirely after lunch, according to the user's selection.
- The block cannot include breaks, lunch, or an already reserved cell.
- An invalid or incomplete lab selection blocks generation and identifies the subject and reason.

### Placement and Library

- The user must select exactly the required number of periods.
- `continuous` means consecutive teaching periods on one day.
- `separate` means individually selected periods, normally on different days; the validator rejects duplicate cells and preserves every selected day/period exactly.
- Neither category is subject to extracurricular placement rules.

### Other extracurricular periods

- Existing extracurricular subjects remain a distinct category.
- Once manually selected, their cells are fixed reservations and are not moved by automatic scheduling.
- Their existing category-specific behavior is retained only where it does not conflict with explicit manual selection; they do not consume Lab, Placement, or Library rules.

### Automatic scheduling

1. Validate all manual reservations.
2. Reserve valid Lab, Placement, Library, and extracurricular cells.
3. Schedule remaining theory subjects only in unreserved teaching slots.
4. Preserve all manual reservations during regeneration of one class or the whole dataset.
5. Report unresolved theory periods and manual-placement conflicts explicitly; never silently move or overwrite a manual reservation.

## UI behavior

- Setup renders a placement editor for each class-specific Lab, Placement, Library, and extracurricular subject.
- Lab exposes a before-lunch/after-lunch selector and a continuous block selector.
- Placement and Library expose continuous-block and separate-period modes.
- Grid manual mode lets the user select cells, shows the active category/subject, and rejects invalid selections immediately.
- Reserved cells have distinct visual labels and are read-only to automatic regeneration.
- Changing a subject's category clears or revalidates incompatible reservation data rather than silently reinterpreting it.

## Backend parity

The Python input parser, scheduler, serializer, and independent validator implement the same reservation schema and rules as the browser scheduler. Existing JSON `ExternalAllotment` output remains compatible, with additional metadata only where needed to preserve mode/session semantics.

## Verification

Tests must cover:

- valid and invalid continuous Lab blocks;
- Lab before-lunch and after-lunch enforcement;
- continuous and separate Placement selections;
- continuous and separate Library selections;
- duplicate, overlapping, break, lunch, and wrong-count selections;
- manual cells surviving automatic generation and regeneration;
- theory scheduling around all manual reservations;
- Placement/Library not being routed through extracurricular rules;
- JavaScript and Python validation behavior;
- existing scheduling behavior remaining green.

