const clean = value => String(value ?? '').trim();

function teachingPeriods(template) {
  return (template?.periods || []).map((period, index) => ({
    number: Number(period.period_number ?? index + 1),
    type: String(period.type || 'TEACHING').toUpperCase(),
  })).filter(period => period.type === 'TEACHING');
}

function allSlots(reservation) {
  if (Array.isArray(reservation?.slots)) {
    return reservation.slots.map(slot => ({ day: clean(slot.day), period: Number(slot.period ?? slot.periodNumber) }));
  }
  const periods = Array.isArray(reservation?.periodNumbers) ? reservation.periodNumbers : [];
  return periods.map(period => ({ day: clean(reservation.day), period: Number(period) }));
}

function requiredPeriods(subject, reservation) {
  return Number(reservation?.requiredPeriods || (reservation?.kind === 'LAB' ? subject?.labPeriods : subject?.placementPeriods || subject?.libraryPeriods || subject?.theoryPeriods) || 0);
}

export function validateManualReservation(reservation, subject = {}, template = {}, occupied = new Set()) {
  const errors = [];
  const kind = String(reservation?.kind || '').toUpperCase();
  const mode = reservation?.mode || (kind === 'LAB' ? 'continuous' : 'separate');
  const slots = allSlots(reservation);
  const teaching = teachingPeriods(template);
  const teachingNumbers = new Set(teaching.map(period => period.number));
  const days = new Set(template?.days || []);
  const required = requiredPeriods(subject, reservation);
  const keys = slots.map(slot => `${slot.day}-${slot.period}`);
  const duplicate = keys.filter((key, index) => keys.indexOf(key) !== index);

  if (!['LAB', 'PLACEMENT', 'LIBRARY', 'EXTRACURRICULAR'].includes(kind)) errors.push(`Unsupported manual reservation category: ${kind || 'missing'}.`);
  if (!required || slots.length !== required) errors.push(`${subject?.name || reservation?.subjectId || 'Subject'} requires exactly ${required} selected period(s); received ${slots.length}.`);
  if (slots.some(slot => !days.has(slot.day))) errors.push('Every selected period must use a day from the class template.');
  if (slots.some(slot => !teachingNumbers.has(slot.period))) errors.push('Manual periods must be teaching periods; breaks and lunch cannot be selected.');
  if (duplicate.length) errors.push('A manual reservation cannot select the same day and period more than once.');
  if (slots.some(slot => occupied.has(`${slot.day}-${slot.period}`))) errors.push('A selected period is already reserved by another manual subject.');

  const sameDay = slots.length > 0 && slots.every(slot => slot.day === slots[0].day);
  const sortedPeriods = slots.map(slot => slot.period).sort((a, b) => a - b);
  const continuous = sameDay && sortedPeriods.every((period, index) => index === 0 || period === sortedPeriods[index - 1] + 1);
  if ((kind === 'LAB' || mode === 'continuous') && !continuous) errors.push(`${kind === 'LAB' ? 'Lab' : kind} periods must be consecutive on one day.`);
  if (kind === 'LAB' && reservation?.session) {
    const lunchNumber = (template?.periods || []).map((period, index) => ({ number: Number(period.period_number ?? index + 1), type: String(period.type || '').toUpperCase() })).find(period => period.type === 'LUNCH')?.number;
    if (reservation.session === 'before_lunch' && lunchNumber !== undefined && sortedPeriods.some(period => period >= lunchNumber)) errors.push('The Lab block must be entirely before lunch.');
    if (reservation.session === 'after_lunch' && lunchNumber !== undefined && sortedPeriods.some(period => period <= lunchNumber)) errors.push('The Lab block must be entirely after lunch.');
  }
  if ((kind === 'PLACEMENT' || kind === 'LIBRARY') && mode === 'separate' && slots.length > 1 && slots.some(slot => slots.filter(other => other.day === slot.day).length > 1)) errors.push('Separate Placement/Library periods must be on different days.');
  return [...new Set(errors)];
}

export function normalizeManualReservations(reservations = [], template, subjects = []) {
  const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
  const occupied = new Set();
  const normalized = [];
  const errors = [];
  for (const input of reservations) {
    const reservation = {
      ...input,
      kind: String(input.kind || '').toUpperCase(),
      mode: input.mode || (String(input.kind).toUpperCase() === 'LAB' ? 'continuous' : 'separate'),
      periodNumbers: (input.periodNumbers || []).map(Number),
      slots: input.slots?.map(slot => ({ day: clean(slot.day), period: Number(slot.period ?? slot.periodNumber) })),
    };
    const subject = subjectById.get(reservation.subjectId) || {};
    const validationErrors = validateManualReservation(reservation, subject, template, occupied);
    if (validationErrors.length) errors.push(...validationErrors.map(message => ({ ...reservation, message })));
    else {
      normalized.push(reservation);
      for (const slot of allSlots(reservation)) occupied.add(`${slot.day}-${slot.period}`);
    }
  }
  return { reservations: normalized, errors };
}

export function reservationSlots(reservation) {
  return allSlots(reservation);
}
