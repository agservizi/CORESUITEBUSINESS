"use client";

import { createContext, useContext } from "react";

interface PlatformUser {
  id: string;
  role: string;
}

const PlatformUserContext = createContext<PlatformUser | null>(null);

export function PlatformUserProvider({
  user,
  children,
}: {
  user: PlatformUser;
  children: React.ReactNode;
}) {
  return (
    <PlatformUserContext.Provider value={user}>
      {children}
    </PlatformUserContext.Provider>
  );
}

export function usePlatformUser() {
  return useContext(PlatformUserContext);
}

export function isPlatformStaffRole(role: string) {
  return ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATORE"].includes(role);
}
