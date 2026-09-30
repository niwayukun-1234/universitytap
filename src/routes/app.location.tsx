import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DoorOpen, LogIn, NotebookPen, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CAMPUSES, campusName, floorLabel, formatDateTime, formatDuration, hhmm, parseFloor, roomLabel } from "@/lib/campus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/location")({
  component: LocationPage,
});

type Building = { id: string; name: string; campus: string; sort_order?: number | null };
type Classroom = {
  id: string;
  name: string;
  building_id: string;
  floor_label?: string | null;
  floor_order?: number | null;
  sort_order?: number | null;
};

// 教室データに階の情報があればそれを使い、無ければ教室名から推定する
const roomFloor = (c: Classroom, buildingName: string): { order: number; label: string } =>
  c.floor_order != null
    ? { order: c.floor_order, label: c.floor_label || floorLabel(c.floor_order) }
    : { order: parseFloor(c.name, buildingName), label: floorLabel(parseFloor(c.name, buildingName)) };

const bySort = <T extends { name: string; sort_order?: number | null }>(a: T, b: T) =>
  (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || a.name.localeCompare(b.name, "ja");
type RoomRef = { name: string; buildings: { name: string; campus: string } | null } | null;
type Checkin = { id: string; created_at: string; left_at: string | null; is_active: boolean; memo: string | null; classrooms: RoomRef };

const placeText = (room: RoomRef) => {
  if (!room) return { campus: "", place: "不明な場所" };
  const b = room.buildings;
  return { campus: campusName(b?.campus), place: b ? `${b.name} ${roomLabel(room.name, b.name)}` : room.name };
};

function LocationPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [current, setCurrent] = useState<Checkin | null>(null);
  const [history, setHistory] = useState<Checkin[]>([]);
  const [hiddenFrom, setHiddenFrom] = useState(0);
  const [campus, setCampus] = useState<string>("imadegawa");
  const [building, setBuilding] = useState<Building | null>(null);
  const [floor, setFloor] = useState<number | null>(null);
  const [target, setTarget] = useState<Classroom | null>(null);
  const [memoEdit, setMemoEdit] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const load = async () => {
    const select = "id, created_at, left_at, is_active, memo, classrooms(name, buildings(name, campus))";
    const [b, hist, hidden] = await Promise.all([
      supabase.from("buildings").select("*").eq("university_id", "doshisha"),
      supabase.from("checkins").select(select).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("friends").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("status", "accepted").eq("share_location", false),
    ]);
    setBuildings(((b.data as Building[]) ?? []).sort(bySort));
    const rows = (hist.data as unknown as Checkin[]) ?? [];
    setHistory(rows);
    setCurrent(rows.find((r) => r.is_active) ?? null);
    setHiddenFrom(hidden.count ?? 0);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  // 教室は数が多いので、選んだ館の分だけ読み込む
  useEffect(() => {
    if (!building) return setClassrooms([]);
    let cancelled = false;
    supabase
      .from("classrooms")
      .select("*")
      .eq("building_id", building.id)
      .then(({ data }) => {
        if (!cancelled) setClassrooms(((data as Classroom[]) ?? []).sort(bySort));
      });
    return () => {
      cancelled = true;
    };
  }, [building]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const enter = async (room: Classroom, memo: string) => {
    if (!user) return;
    // 入室中の場所があれば退室扱いにしてから入室
    await supabase.from("checkins").update({ is_active: false, left_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_active", true);
    const { error } = await supabase.from("checkins").insert({ user_id: user.id, classroom_id: room.id, memo, is_active: true });
    if (error) return toast.error(error.message);
    setTarget(null);
    setBanner("入室を登録しました。");
    window.scrollTo({ top: 0, behavior: "smooth" });
    load();
  };

  const leave = async () => {
    if (!current) return;
    await supabase.from("checkins").update({ is_active: false, left_at: new Date().toISOString() }).eq("id", current.id);
    setBanner("退室しました。");
    load();
  };

  const saveMemo = async (memo: string) => {
    if (!current) return;
    const { error } = await supabase.from("checkins").update({ memo }).eq("id", current.id);
    if (error) return toast.error(error.message);
    setMemoEdit(false);
    setBanner("メモを更新しました。");
    load();
  };

  const campusBuildings = buildings.filter((b) => b.campus === campus);
  const buildingRooms = useMemo(() => (building ? classrooms.filter((c) => c.building_id === building.id) : []), [building, classrooms]);
  const floors = useMemo(() => {
    if (!building) return [];
    const map = new Map<number, string>();
    for (const c of buildingRooms) {
      const f = roomFloor(c, building.name);
      if (!map.has(f.order)) map.set(f.order, f.label);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([order, label]) => ({ order, label }));
  }, [building, buildingRooms]);
  const floorRooms = building && floor != null ? buildingRooms.filter((c) => roomFloor(c, building.name).order === floor) : [];
  const past = history.filter((h) => !h.is_active).slice(0, 5);
  const cur = current ? placeText(current.classrooms) : null;

  return (
    <div className="space-y-5">
      {banner && (
        <div className="rounded-2xl border border-success/25 bg-success-soft px-5 py-4 text-lg font-medium text-success">{banner}</div>
      )}

      <section className="ut-card">
        <div className="ut-eyebrow">現在地ステータス</div>
        {current && cur ? (
          <>
            <div className="mt-3 flex gap-3">
              <span className="mt-2.5 h-4 w-4 shrink-0 rounded-full bg-primary shadow-[0_0_0_6px_oklch(0.36_0.16_318/0.15)]" />
              <h2 className="text-3xl font-extrabold leading-snug">
                {cur.campus}
                <br />
                {cur.place}
              </h2>
            </div>
            <div className="mt-3 space-y-1.5 pl-7 text-lg text-muted-foreground">
              <p>入室: {hhmm(current.created_at)} (現在滞在中)</p>
              <p>表示先: {hiddenFrom === 0 ? "すべてのフレンド" : `フレンド（${hiddenFrom}人には非公開）`}</p>
              {current.memo && <p className="text-foreground">📝 {current.memo}</p>}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setMemoEdit(true)} className="ut-btn-outline flex-1 rounded-full py-4 text-lg">
                <NotebookPen className="h-5 w-5" />
                {current.memo ? "メモを編集" : "メモを追加"}
              </button>
              <button type="button" onClick={leave} className="ut-btn-primary flex-1 rounded-full py-4 text-lg">
                退室する
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-lg text-muted-foreground">現在どこにも入室していません。下から場所を選んで入室しましょう。</p>
        )}
      </section>

      <section className="ut-card">
        <div className="ut-eyebrow">場所を選んで入室</div>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl bg-muted p-1">
          {CAMPUSES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCampus(c.id);
                setBuilding(null);
                setFloor(null);
              }}
              className={cn("rounded-xl py-2 text-sm font-bold transition", campus === c.id ? "bg-card text-primary shadow" : "text-muted-foreground")}
            >
              {c.name.replace("キャンパス", "")}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {campusBuildings.length === 0 && <p className="py-4 text-center text-muted-foreground">このキャンパスの館は準備中です。</p>}
          {campusBuildings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBuilding(building?.id === b.id ? null : b);
                setFloor(null);
              }}
              className={cn(
                "w-full rounded-2xl border py-4 text-center text-xl font-bold transition",
                building?.id === b.id ? "ut-soft" : "border-border bg-card hover:bg-muted",
              )}
            >
              {b.name}
            </button>
          ))}
        </div>

        {building && (
          <div className="mt-6">
            <div className="ut-eyebrow mb-2">階選択</div>
            <div className="max-h-72 space-y-2.5 overflow-y-auto rounded-3xl border border-border p-2.5">
              {floors.map((f) => (
                <button
                  key={f.order}
                  type="button"
                  onClick={() => setFloor(f.order)}
                  className={cn("ut-list-btn text-lg", floor === f.order && "ut-soft")}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {building && floor != null && (
          <div className="mt-6">
            <div className="ut-eyebrow mb-2">教室選択</div>
            <div className="max-h-96 space-y-2.5 overflow-y-auto rounded-3xl border border-border p-2.5">
              {floorRooms.map((c) => (
                <button key={c.id} type="button" onClick={() => setTarget(c)} className={cn("ut-list-btn text-lg", target?.id === c.id && "ut-soft")}>
                  {roomLabel(c.name, building.name)}
                  <LogIn className="h-5 w-5 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="ut-card">
        <div className="ut-eyebrow">最近の履歴</div>
        {past.length === 0 ? (
          <p className="mt-3 text-muted-foreground">まだ履歴がありません。</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {past.map((h) => {
              const p = placeText(h.classrooms);
              return (
                <li key={h.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="font-bold">{p.place}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(h.created_at)} 〜 {h.left_at ? hhmm(h.left_at) : ""}（{formatDuration(h.created_at, h.left_at)}）
                  </div>
                  {h.memo && <div className="mt-1 text-sm text-muted-foreground">📝 {h.memo}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {target && building && (
        <MemoSheet
          eyebrow="入室メモ"
          title={roomLabel(target.name, building.name)}
          place={`${campusName(building.campus)} / ${building.name} ${roomLabel(target.name, building.name)}`}
          submitLabel="入室する"
          onClose={() => setTarget(null)}
          onSubmit={(memo) => enter(target, memo)}
        />
      )}

      {memoEdit && current && cur && (
        <MemoSheet
          eyebrow="メモ"
          title={cur.place}
          place={`${cur.campus} / ${cur.place}`}
          initialMemo={current.memo ?? ""}
          submitLabel="保存する"
          onClose={() => setMemoEdit(false)}
          onSubmit={saveMemo}
        />
      )}
    </div>
  );
}

function MemoSheet({
  eyebrow,
  title,
  place,
  initialMemo = "",
  submitLabel,
  onClose,
  onSubmit,
}: {
  eyebrow: string;
  title: string;
  place: string;
  initialMemo?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(initialMemo);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await onSubmit(memo.trim());
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-[32px] bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="ut-eyebrow">{eyebrow}</div>
            <h2 className="mt-1 text-2xl font-extrabold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="ut-soft mt-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 font-bold">
          <DoorOpen className="h-6 w-6 shrink-0" />
          {place}
        </div>
        <label className="mt-5 block">
          <span className="ut-eyebrow">メモ</span>
          <textarea
            className="ut-input mt-2 min-h-36 resize-none"
            value={memo}
            maxLength={200}
            placeholder="例: 3番の席にいます。空いてる人は来て！"
            onChange={(e) => setMemo(e.target.value)}
          />
        </label>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={submit} disabled={busy} className="ut-btn-primary w-full rounded-full py-4 text-lg">
            {submitLabel}
          </button>
          <button type="button" onClick={onClose} className="ut-btn-outline w-full rounded-full py-4 text-lg">
            戻る
          </button>
        </div>
      </div>
    </div>
  );
}
