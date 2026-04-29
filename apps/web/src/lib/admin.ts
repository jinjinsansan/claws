export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "admin@ai-builders-lab.com";

export function isAdmin(email: string | undefined | null): boolean {
  return email === ADMIN_EMAIL;
}
