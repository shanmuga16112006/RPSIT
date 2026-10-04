import test from 'node:test';
import assert from 'node:assert/strict';
import { renderShell, renderSetup, renderTeacherTimetable, renderLabTimetable } from '../src/ui.js';

test('offers class and teacher formats in the top selector', () => {
  const html = renderShell();
  assert.match(html, /value="class">Class template/);
  assert.match(html, /value="teacher">Teacher template/);
});

test('renders working teacher and lab timetable views', () => {
  const model = { classes: ['AIDS'], teachers: { T1: { name: 'Teacher One', initials: 'TO' } }, subjects: [{ id: 'lab', className: 'AIDS', acronym: 'LB', code: 'L1', name: 'Lab', teacher: 'Teacher One', labPeriods: 2 }] };
  const schedule = { className: 'AIDS', MON: Array(8).fill(null), TUE: Array(8).fill(null), WED: Array(8).fill(null), THU: Array(8).fill(null), FRI: Array(8).fill(null), SAT: Array(8).fill(null) };
  schedule.MON[2] = { subjectId: 'lab', acronym: 'LB', kind: 'lab', teacher: 'Teacher One', period: 2 };
  schedule.MON[3] = { subjectId: 'lab', acronym: 'LB', kind: 'lab', teacher: 'Teacher One', period: 3 };
  const result = { schedules: { AIDS: schedule } };
  assert.match(renderTeacherTimetable(result, model), /Individual timetable/);
  assert.match(renderTeacherTimetable(result, model), /teacher-selector/);
  assert.match(renderTeacherTimetable(result, model), /Print \/ Save PDF/);
  assert.match(renderLabTimetable(result, model, 'AIDS'), /LB P3–P4/);
});

test('renders each lab Day dropdown with its own stored day and reflects updates', () => {
  const model = {
    activeClass: 'AIDS', classes: ['AIDS'], filename: 'classes.xlsx',
    subjects: [
      { id: 'a', className: 'AIDS', acronym: 'DB', code: 'D1', name: 'Database', teacher: 'T1', theoryPeriods: 4, labPeriods: 2 },
      { id: 'b', className: 'AIDS', acronym: 'OS', code: 'O1', name: 'Operating Systems', teacher: 'T2', theoryPeriods: 4, labPeriods: 2 }
    ],
    staff: [],
    labs: [
      { subjectId: 'a', day: '', startPeriod: null, length: 2 },
      { subjectId: 'b', day: 'WED', startPeriod: 5, length: 2 }
    ]
  };
  const html = renderSetup(model);
  const dbSelect = html.match(/<select data-lab-day="a">([\s\S]*?)<\/select>/)[1];
  const osSelect = html.match(/<select data-lab-day="b">([\s\S]*?)<\/select>/)[1];
  assert.match(dbSelect, /<option value="MON" >MON<\/option>/);
  assert.doesNotMatch(dbSelect, /value="MON" selected/);
  assert.match(osSelect, /<option value="WED" selected>WED<\/option>/);
  assert.doesNotMatch(osSelect, /value="MON" selected/);
  assert.match(html, /<select data-lab-period="a">/);
  const osPeriod = html.match(/<select data-lab-period="b">([\s\S]*?)<\/select>/)[1];
  assert.match(osPeriod, /<option value="5" selected>Period 5<\/option>/);
  model.labs[0].day = 'THU';
  const reRendered = renderSetup(model);
  assert.match(reRendered, /<select data-lab-day="a">[\s\S]*?<option value="THU" selected>THU<\/option>/);
  assert.doesNotMatch(reRendered, /data-lab-day="b"[\s\S]*?<option value="THU" selected>/);
});

test('derives starting-period options from the scheduler length, not workload lab hours', () => {
  const model = {
    activeClass: 'AIDS', classes: ['AIDS'],
    subjects: [{ id: 'a', className: 'AIDS', acronym: 'AIT', code: 'AIT1', name: 'AIT Lab', teacher: 'T1', theoryPeriods: 4, labPeriods: 2 }],
    staff: [],
    labs: [{ subjectId: 'a', day: 'MON', startPeriod: 5, length: 4 }]
  };
  const html = renderSetup(model);
  const periodSelect = html.match(/<select data-lab-period="a">([\s\S]*?)<\/select>/)[1];
  assert.match(periodSelect, /<option value="5" selected>Period 5<\/option>/);
  assert.doesNotMatch(periodSelect, /Period 6/);
});

test('renders staff roles and subjects only for the selected class', () => {
  const model = {
    activeClass: 'AIDS', classes: ['AIDS', 'CSE'], filename: 'classes.xlsx',
    subjects: [
      { id: 'a', className: 'AIDS', acronym: 'AI', code: 'A1', name: 'AI Subject', teacher: 'Teacher One', theoryPeriods: 2, labPeriods: 0 },
      { id: 'c', className: 'CSE', acronym: 'CS', code: 'C1', name: 'CSE Subject', teacher: 'Teacher Two', theoryPeriods: 2, labPeriods: 0 }
    ],
    staff: [
      { name: 'Teacher One', initials: 'TO', hodFor: ['AIDS'], ccFor: [] },
      { name: 'Teacher Two', initials: 'TT', hodFor: [], ccFor: ['CSE'] }
    ],
    labs: []
  };
  const html = renderSetup(model);
  assert.match(html, /STAFF RULES · AIDS/);
  assert.match(html, /Teacher One/);
  assert.doesNotMatch(html, /Teacher Two/);
  assert.match(html, /HOD · On/);
  assert.match(html, /CC · Off/);
  assert.match(html, /AI Subject/);
  assert.doesNotMatch(html, /CSE Subject/);
});

test('renders one starting Period and one Day selector for each Placement and Library subject', () => {
  const html = renderSetup({
    activeClass: 'AIDS', classes: ['AIDS'], subjects: [
      { id: 'p', className: 'AIDS', acronym: 'PT', code: 'P1', name: 'Placement', teacher: 'T1', theoryPeriods: 2, labPeriods: 0, manualKind: 'placement' },
      { id: 'l', className: 'AIDS', acronym: 'LIB', code: 'L1', name: 'Library', teacher: 'T2', theoryPeriods: 3, labPeriods: 0, manualKind: 'library' },
    ], staff: [], labs: [], manualReservations: [], manualSelectionRequired: true
  });
  assert.match(html, /Placement and Library/);
  assert.match(html, /2 continuous periods/);
  assert.match(html, /3 continuous periods/);
  assert.doesNotMatch(html, /data-manual-mode="p"/);
  assert.doesNotMatch(html, /data-manual-mode="l"/);
  assert.match(html, /for every class in the class selector/);
  assert.doesNotMatch(html, /data-extracurricular="p"/);
  assert.doesNotMatch(html, /data-extracurricular="l"/);
  for (const id of ['p', 'l']) {
    assert.doesNotMatch(html, new RegExp(`data-slot-index`, 'g'));
    assert.equal((html.match(new RegExp(`data-manual-period="${id}"`, 'g')) || []).length, 1);
    assert.equal((html.match(new RegExp(`data-manual-day="${id}"`, 'g')) || []).length, 1);
  }
  assert.match(html, />Period<\/span><select data-manual-period="p">/);
  assert.match(html, />Day<\/span><select data-manual-day="p">/);
  const placementPeriod = html.match(/<select data-manual-period="p">([\s\S]*?)<\/select>/)[1];
  assert.match(placementPeriod, /<option value="7"\s*>7<\/option>/);
  assert.doesNotMatch(placementPeriod, /<option value="8"/);
  const libraryPeriod = html.match(/<select data-manual-period="l">([\s\S]*?)<\/select>/)[1];
  assert.match(libraryPeriod, /<option value="6"\s*>6<\/option>/);
  assert.doesNotMatch(libraryPeriod, /<option value="7"/);
});

test('preselects the saved starting period and day of a Placement reservation', () => {
  const html = renderSetup({
    activeClass: 'AIDS', classes: ['AIDS'], subjects: [
      { id: 'p', className: 'AIDS', acronym: 'PT', code: 'P1', name: 'Placement', teacher: 'T1', theoryPeriods: 2, labPeriods: 0, manualKind: 'placement' }
    ], staff: [], labs: [], manualReservations: [
      { subjectId: 'p', className: 'AIDS', kind: 'PLACEMENT', mode: 'continuous', slots: [{ day: 'WED', period: 3 }, { day: 'WED', period: 4 }] }
    ]
  });
  assert.match(html, /<select data-manual-period="p">[\s\S]*?<option value="3" selected>3<\/option>/);
  assert.match(html, /<select data-manual-day="p">[\s\S]*?<option value="WED" selected>Wednesday<\/option>/);
  assert.match(html, /Periods 3-4/);
});
