const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
};

function isTimeZoneAbbreviation(value: string): boolean {
  return /^[A-Z]{2,5}$/.test(value);
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

function formatDeletionInstant(instant: Date, locale: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    ...DATE_TIME_OPTIONS,
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(instant);
  const day = partValue(parts, 'day');
  const month = partValue(parts, 'month');
  const year = partValue(parts, 'year');
  const hour = partValue(parts, 'hour');
  const minute = partValue(parts, 'minute');
  const zoneName = partValue(parts, 'timeZoneName');
  const dateTime = `${day} ${month} ${year}, ${hour}:${minute}`;

  if (isTimeZoneAbbreviation(zoneName)) {
    return `${dateTime} ${zoneName}`;
  }

  return dateTime;
}

export { formatDeletionInstant };
