export type RedirectTarget =
  | "/"
  | "/profile"
  | "/cart"
  | "/checkout"
  | string;

const SAFE_PREFIXES = ["/products", "/articles", "/stores", "/cart", "/checkout", "/profile"];

export function isSafeRedirect(target: string | null | undefined): boolean {
  if (!target) return false;
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false;
  if (target.startsWith("/api/")) return false;
  return true;
}

export function getPostAuthRedirect(
  requested: string | null | undefined,
  fallback: RedirectTarget = "/profile"
): RedirectTarget {
  if (requested && isSafeRedirect(requested)) {
    if (SAFE_PREFIXES.some((prefix) => requested === prefix || requested.startsWith(prefix + "/"))) {
      return requested as RedirectTarget;
    }
  }
  return fallback;
}

