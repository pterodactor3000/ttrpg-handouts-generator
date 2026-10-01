const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

function isTimeZoneAbbreviation(value: string): boolean {
  return /^[A-Z]{2,5}$/.test(value);
}

function formatDeletionInstant(instant: Date, locale: string, timeZone: string): string {
  const withZoneName = new Intl.DateTimeFormat(locale, {
    ...DATE_TIME_OPTIONS,
    timeZone,
    timeZoneName: 'short',
  });
  const zoneName = withZoneName.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;

  if (zoneName && isTimeZoneAbbreviation(zoneName)) {
    return withZoneName.format(instant);
  }

  return new Intl.DateTimeFormat(locale, { ...DATE_TIME_OPTIONS, timeZone }).format(instant);
}

export { formatDeletionInstant };
