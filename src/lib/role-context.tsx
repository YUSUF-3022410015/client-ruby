"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@/types";

interface UserRole {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner" | "gudang" | "sales";
}

interface RoleContextType {
  user: UserRole | null;
  loading: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  user: null,
  loading: true,
  hasRole: () => false,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("id", authUser.id)
          .single();
        if (profile) {
          setUser(profile as UserRole);
        }
      }
      setLoading(false);
    }
    fetchUserRole();
  }, []);

  function hasRole(...roles: string[]) {
    if (!user) return false;
    return roles.includes(user.role);
  }

  return (
    <RoleContext.Provider value={{ user, loading, hasRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
