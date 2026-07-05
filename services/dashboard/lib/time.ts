export function localTimeZoneAbbr(date = new Date()): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? 'local';
}
