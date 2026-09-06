const MELBOURNE_TZ = "Australia/Melbourne";

export function melbourneParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: MELBOURNE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
  };
}

function melbourneOnePmUtc(year: number, month: number, day: number) {
  const utcGuess = Date.UTC(year, month - 1, day, 3, 0, 0);
  const local = melbourneParts(new Date(utcGuess));
  const driftHours = local.hour - 13;
  return new Date(utcGuess - driftHours * 60 * 60 * 1000);
}

export function nextMelbourneOnePm(now = new Date()) {
  const local = melbourneParts(now);
  if (local.hour < 13) {
    return melbourneOnePmUtc(local.year, local.month, local.day);
  }
  const next = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  const rolled = melbourneParts(next);
  return melbourneOnePmUtc(rolled.year, rolled.month, rolled.day);
}

export { MELBOURNE_TZ };
