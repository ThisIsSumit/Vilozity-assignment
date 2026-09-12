import { formatDistanceToNow, format } from "date-fns";

export function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function exactTime(iso: string) {
  try {
    return format(new Date(iso), "PPpp");
  } catch {
    return iso;
  }
}

export function shortDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}
