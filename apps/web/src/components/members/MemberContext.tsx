"use client";

import { createContext, useContext } from "react";
import type { PlanAccess } from "@/lib/plans";

export interface MemberProfile {
  userId: string;
  email: string;
  name: string;
  plan: string | null;
  access: PlanAccess;
  communityFreeUntil: string | null;
  isAdmin: boolean;
}

const MemberContext = createContext<MemberProfile | null>(null);

export function MemberProvider({
  profile,
  children,
}: {
  profile: MemberProfile;
  children: React.ReactNode;
}) {
  return (
    <MemberContext.Provider value={profile}>{children}</MemberContext.Provider>
  );
}

export function useMember(): MemberProfile {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used within MemberProvider");
  return ctx;
}
