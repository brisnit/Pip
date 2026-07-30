/**
 * Minimal class-name joiner. Falsy values are dropped, which makes
 * `cond && "class"` and `count && "class"` both safe at call sites.
 */
export function cn(
  ...values: (string | number | bigint | false | null | undefined)[]
): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
