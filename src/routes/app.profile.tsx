import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/brand";
import { Field } from "@/components/auth-shell";
import { PageCard } from "@/components/page-card";
import { UNIVERSITY_NAMES } from "@/lib/friends";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ full_name: "", faculty: "", department: "", circle: "", seminar: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name,
      faculty: profile.faculty ?? "",
      department: profile.department ?? "",
      circle: profile.circle ?? "",
      seminar: profile.seminar ?? "",
      avatar_url: profile.avatar_url ?? "",
    });
  }, [profile]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.full_name.trim()) return toast.error("氏名を入力してください");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ ...form, full_name: form.full_name.trim() }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    refreshProfile();
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("画像ファイルを選んでください");
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((f) => ({ ...f, avatar_url: data.publicUrl }));
    toast.success("アイコンを変更しました。「保存する」で確定します");
  };

  return (
    <PageCard eyebrow="メニュー" title="アカウント設定">
      <div className="flex items-center gap-4">
        <label className="relative cursor-pointer">
          <UserAvatar src={form.avatar_url} name={form.full_name} className="h-20 w-20" />
          <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Camera className="h-4 w-4" />
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </label>
        <div className="min-w-0">
          <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
          <div className="font-bold">{UNIVERSITY_NAMES[profile?.university_id ?? ""] ?? ""}</div>
          <div className="text-sm text-muted-foreground">フレンドコード: {profile?.public_id}</div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Field label="氏名">
          <input className="ut-input" value={form.full_name} onChange={set("full_name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="学部">
            <input className="ut-input" value={form.faculty} placeholder="例: 経済学部" onChange={set("faculty")} />
          </Field>
          <Field label="学科">
            <input className="ut-input" value={form.department} placeholder="例: 経済学科" onChange={set("department")} />
          </Field>
        </div>
        <Field label="サークル">
          <input className="ut-input" value={form.circle} onChange={set("circle")} />
        </Field>
        <Field label="ゼミ">
          <input className="ut-input" value={form.seminar} onChange={set("seminar")} />
        </Field>
        <button type="button" onClick={save} disabled={saving} className="ut-btn-primary w-full py-4 text-lg">
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </PageCard>
  );
}
