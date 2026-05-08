import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { memberNavItems } from "@/lib/admin";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.name ?? user.email?.split("@")[0] ?? "会員";

  return (
    <div className="min-h-screen bg-bg-deep text-text-main">
      <header className="fixed top-0 w-full z-50 bg-bg-deep/80 backdrop-blur-md border-b border-border-faint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="font-cinzel text-xl font-bold text-gold">
            OPENCLAW
          </Link>
          <span className="text-text-dim text-sm">{name} さん</span>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-16 flex gap-4 lg:gap-8">
        <aside className="w-48 shrink-0 hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {memberNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-main hover:bg-surface transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
