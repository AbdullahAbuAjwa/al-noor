export type Availability = "upcoming" | "open" | "closed";

// Opening is inclusive and closing is exclusive (D05), always on server time.
export function quizAvailability(
  opensAt: Date,
  closesAt: Date,
  now: Date,
): Availability {
  if (now.getTime() < opensAt.getTime()) return "upcoming";
  if (now.getTime() < closesAt.getTime()) return "open";
  return "closed";
}
