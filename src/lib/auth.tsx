import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  university_id: string | null;
  faculty: string | null;
  department: string | null;
  circle: string | null;
  seminar: string | null;
  avatar_url: string | null;
  public_id: string;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) return setProfile(data as Profile);
    // ゲスト（匿名ログイン）などでプロフィールが自動作成されなかった場合はここで作る
    const { data: u } = await supabase.auth.getUser();
    const meta = (u.user?.user_metadata ?? {}) as { full_name?: string; university_id?: string };
    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: uid,
        full_name: meta.full_name || "ゲスト",
        university_id: meta.university_id || "doshisha",
        email: u.user?.email ?? null,
      })
      .select("*")
      .maybeSingle();
    if (created) return setProfile(created as Profile);
    // 同時にデータベース側でも作られていた場合（重複エラー）は取り直す
    const { data: again } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((again as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}