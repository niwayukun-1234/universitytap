import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { deleteDemoSchedule, demoSchedules, isDemoId, isGuest, saveDemoSchedule } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CalendarPlus, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

type Schedule = {
  id: string;
  day_of_week: number;
  period: number;
  title: string;
  category: string;
  color: string;
  location: string | null;
  memo: string | null;
};

const DAYS = ["月", "火", "水", "木", "金", "土"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const PERIOD_TIMES: Record<number, string> = {
  1: "9:00-10:30",
  2: "10:45-12:15",
  3: "13:10-14:40",
  4: "14:55-16:25",
  5: "16:40-18:10",
  6: "18:25-19:55",
  7: "20:10-21:40",
};
const PERIOD_HM: Record<number, [number, number, number, number]> = {
  1: [9, 0, 10, 30],
  2: [10, 45, 12, 15],
  3: [13, 10, 14, 40],
  4: [14, 55, 16, 25],
  5: [16, 40, 18, 10],
  6: [18, 25, 19, 55],
  7: [20, 10, 21, 40],
};
const CATEGORIES = [
  { v: "class", l: "授業", c: "#3b82f6" },
  { v: "circle", l: "サークル", c: "#10b981" },
  { v: "parttime", l: "バイト", c: "#f59e0b" },
  { v: "club", l: "部活", c: "#ef4444" },
  { v: "other", l: "その他", c: "#8b5cf6" },
];

export function TimetableView({ userId, editable, heading }: { userId: string; editable: boolean; heading?: string }) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [edit, setEdit] = useState<{ d: number; p: number; existing?: Schedule } | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const { user } = useAuth();
  // ゲスト本人とデモのフレンドの時間割はデモデータ（データベースには保存しない）
  const demo = isDemoId(userId) || (isGuest(user) && userId === user?.id);

  const load = async () => {
    if (demo) return setItems([...demoSchedules(userId, !isDemoId(userId))]);
    const { data } = await supabase.from("schedules").select("*").eq("user_id", userId);
    setItems((data as Schedule[]) || []);
  };
  useEffect(() => { load(); }, [userId, demo]);

  const find = (d: number, p: number) => items.find((i) => i.day_of_week === d && i.period === p);

  const exportToGoogle = (s: Schedule) => {
    const today = new Date();
    const jsDow = (s.day_of_week + 1) % 7; // 月=0→JS月=1
    const diff = (jsDow - today.getDay() + 7) % 7 || 7;
    const date = new Date(today);
    date.setDate(today.getDate() + diff);
    const [sh, sm, eh, em] = PERIOD_HM[s.period];
    const start = new Date(date); start.setHours(sh, sm, 0, 0);
    const end = new Date(date); end.setHours(eh, em, 0, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.set("action", "TEMPLATE");
    url.searchParams.set("text", s.title);
    url.searchParams.set("dates", `${fmt(start)}/${fmt(end)}`);
    url.searchParams.set("details", `${s.memo || ""}`);
    if (s.location) url.searchParams.set("location", s.location);
    window.open(url.toString(), "_blank");
  };

  return (
    <section className="ut-card px-3 py-4 sm:px-5">
      {heading && (
        <h2 className="ut-card-title mb-3 px-1 text-xl">
          <Calendar className="h-6 w-6 text-primary" />
          {heading}
        </h2>
      )}
      {editable && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setSyncOpen(true)} className="ut-soft flex items-center justify-center gap-2 rounded-3xl bg-card px-3 py-3.5 font-bold">
            <CalendarPlus className="h-5 w-5 shrink-0" />
            カレンダーにエクスポート
          </button>
          <button type="button" onClick={() => exportTimetableImage(items)} className="ut-soft flex items-center justify-center gap-2 rounded-3xl bg-card px-3 py-3.5 font-bold">
            <Download className="h-5 w-5 shrink-0" />
            画像出力
          </button>
        </div>
      )}
      {/* 時限の列は細くして、月〜土を1画面に収める */}
      <div className="grid grid-cols-[2.1rem_repeat(6,minmax(0,1fr))] gap-1 sm:grid-cols-[2.75rem_repeat(6,minmax(0,1fr))] sm:gap-1.5">
        <div className="rounded-xl bg-brand-soft py-2 text-center text-[11px] font-bold text-primary sm:text-xs">時限</div>
        {DAYS.map((d) => (
          <div key={d} className="rounded-xl bg-brand-soft py-2 text-center text-sm font-bold text-primary">
            {d}
          </div>
        ))}
        {PERIODS.map((p) => (
          <Fragment key={p}>
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-1 leading-tight">
              <span className="text-base font-extrabold">{p}</span>
              <span className="text-[8px] text-muted-foreground sm:text-[9px]">{PERIOD_TIMES[p].split("-")[0]}</span>
            </div>
            {DAYS.map((_, d) => {
              const s = find(d, p);
              const cat = s ? CATEGORIES.find((c) => c.v === s.category) : undefined;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => editable && setEdit({ d, p, existing: s })}
                  disabled={!editable}
                  className="relative h-[4.5rem] overflow-hidden rounded-xl border bg-card p-1 text-left transition enabled:hover:bg-muted sm:h-20 sm:p-1.5"
                  style={s ? { borderColor: s.color + "99", boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
                >
                  {s ? (
                    <>
                      <span
                        className="inline-block max-w-full truncate rounded-full px-1.5 py-px text-[9px] font-bold sm:text-[10px]"
                        style={{ backgroundColor: s.color + "22", color: s.color }}
                      >
                        {cat?.l ?? "予定"}
                      </span>
                      <div className="mt-0.5 line-clamp-2 break-all pl-0.5 text-[11px] font-bold leading-tight sm:text-xs">{s.title}</div>
                      {s.location && <div className="truncate pl-0.5 text-[9px] text-muted-foreground">{s.location}</div>}
                    </>
                  ) : (
                    <span className="block pt-1 text-center text-[10px] font-bold text-muted-foreground/80 sm:text-xs">未登録</span>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <EditDialog
        edit={edit}
        userId={userId}
        demo={demo}
        onClose={() => setEdit(null)}
        onSaved={() => { load(); setEdit(null); }}
        onExport={exportToGoogle}
      />
      {editable && <GoogleSyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} items={items} />}
    </section>
  );
}

/** 時間割を PNG 画像として保存する */
function exportTimetableImage(items: Schedule[]) {
  const colW = 150, headH = 56, rowH = 96, leftW = 104, pad = 32;
  const W = pad * 2 + leftW + colW * DAYS.length;
  const H = pad * 2 + 60 + headH + rowH * PERIODS.length;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return toast.error("画像を作成できませんでした");
  ctx.scale(scale, scale);
  const font = (w: number, size: number) => `${w} ${size}px "Noto Sans JP", sans-serif`;
  const box = (x: number, y: number, w: number, h: number, r: number, color: string) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const text = (t: string, x: number, y: number, f: string, color: string, align: CanvasTextAlign = "left") => {
    ctx.font = f;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(t, x, y);
  };

  ctx.fillStyle = "#f6f2f9";
  ctx.fillRect(0, 0, W, H);
  text("時間割", pad, pad + 32, font(800, 30), "#4a0a63");
  text("UniversityTap", W - pad, pad + 30, font(700, 16), "#8a7f99", "right");

  const top = pad + 60;
  const heads = [{ x: pad, w: leftW, label: "時限" }, ...DAYS.map((d, i) => ({ x: pad + leftW + colW * i, w: colW, label: d }))];
  for (const h of heads) {
    box(h.x + 3, top + 3, h.w - 6, headH - 6, 14, "#f5e6f7");
    text(h.label, h.x + h.w / 2, top + headH / 2 + 6, font(700, 18), "#4a0a63", "center");
  }

  PERIODS.forEach((p, r) => {
    const y = top + headH + rowH * r;
    box(pad + 3, y + 3, leftW - 6, rowH - 6, 14, "#ffffff");
    text(`${p}`, pad + leftW / 2, y + 42, font(800, 22), "#1f1630", "center");
    text(PERIOD_TIMES[p], pad + leftW / 2, y + 64, font(500, 12), "#8a7f99", "center");

    DAYS.forEach((_, d) => {
      const x = pad + leftW + colW * d;
      const s = items.find((i) => i.day_of_week === d && i.period === p);
      box(x + 3, y + 3, colW - 6, rowH - 6, 14, "#ffffff");
      if (!s) {
        text("未登録", x + colW / 2, y + 30, font(600, 14), "#b5adc2", "center");
        return;
      }
      box(x + 3, y + 3, 6, rowH - 6, 3, s.color);
      text(s.title.length > 9 ? s.title.slice(0, 9) + "…" : s.title, x + 16, y + 34, font(700, 15), "#1f1630");
      if (s.location) text(s.location.slice(0, 12), x + 16, y + 56, font(500, 12), "#8a7f99");
    });
  });

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "timetable.png";
  a.click();
  toast.success("時間割の画像を保存しました");
}

function EditDialog({ edit, userId, demo, onClose, onSaved, onExport }: {
  edit: { d: number; p: number; existing?: Schedule } | null;
  userId: string;
  demo: boolean;
  onClose: () => void;
  onSaved: () => void;
  onExport: (s: Schedule) => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("class");
  const [color, setColor] = useState("#3b82f6");
  const [location, setLocation] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (edit?.existing) {
      setTitle(edit.existing.title);
      setCategory(edit.existing.category);
      setColor(edit.existing.color);
      setLocation(edit.existing.location || "");
      setMemo(edit.existing.memo || "");
    } else if (edit) {
      setTitle(""); setCategory("class"); setColor("#3b82f6"); setLocation(""); setMemo("");
    }
  }, [edit]);

  if (!edit) return null;

  const save = async () => {
    if (!title.trim()) return toast.error("タイトルを入力してください");
    const payload = { user_id: userId, day_of_week: edit.d, period: edit.p, title, category, color, location, memo };
    if (demo) {
      saveDemoSchedule({ id: edit.existing?.id ?? `demo-me-${edit.d}-${edit.p}`, day_of_week: edit.d, period: edit.p, title, category, color, location, memo });
      toast.success("保存しました（デモ）");
      return onSaved();
    }
    const { error } = await supabase.from("schedules").upsert(payload, { onConflict: "user_id,day_of_week,period" });
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onSaved();
  };

  const del = async () => {
    if (!edit.existing) return;
    if (demo) {
      deleteDemoSchedule(edit.existing.id);
      toast.success("削除しました（デモ）");
      return onSaved();
    }
    await supabase.from("schedules").delete().eq("id", edit.existing.id);
    toast.success("削除しました");
    onSaved();
  };

  return (
    <Dialog open={!!edit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{DAYS[edit.d]}曜日 {edit.p}限</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例: マクロ経済学" />
          </div>
          <div>
            <Label>種別</Label>
            <Select value={category} onValueChange={(v) => {
              setCategory(v);
              const def = CATEGORIES.find((c) => c.v === v);
              if (def) setColor(def.c);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>色</Label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20" />
          </div>
          <div>
            <Label>場所</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例: 良心館 RY101" />
          </div>
          <div>
            <Label>メモ</Label>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {edit.existing && (
            <>
              <Button variant="outline" size="sm" onClick={() => onExport({ ...edit.existing!, title, category, color, location, memo })}>
                Googleカレンダーへ
              </Button>
              <Button variant="destructive" size="sm" onClick={del}><Trash2 className="h-4 w-4" /></Button>
            </>
          )}
          <Button onClick={save}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoogleSyncDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: Schedule[] }) {
  const [weeks, setWeeks] = useState(4);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const dow = d.getDay(); // 0=日
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + mondayOffset);
    return d.toISOString().slice(0, 10);
  });

  const downloadIcs = () => {
    if (items.length === 0) return toast.error("時間割が空です");
    const start = new Date(startDate + "T00:00:00");
    const events: string[] = [];
    const fmt = (d: Date) =>
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0") + "T" +
      String(d.getHours()).padStart(2, "0") +
      String(d.getMinutes()).padStart(2, "0") + "00";

    for (let w = 0; w < weeks; w++) {
      for (const s of items) {
        const day = new Date(start);
        day.setDate(start.getDate() + w * 7 + s.day_of_week);
        const [sh, sm, eh, em] = PERIOD_HM[s.period];
        const startDt = new Date(day); startDt.setHours(sh, sm, 0, 0);
        const endDt = new Date(day); endDt.setHours(eh, em, 0, 0);
        const uid = `${s.id}-${w}@university-tap`;
        events.push(
          ["BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTAMP:${fmt(new Date())}`,
            `DTSTART:${fmt(startDt)}`,
            `DTEND:${fmt(endDt)}`,
            `SUMMARY:${s.title.replace(/[\n,;]/g, " ")}`,
            s.location ? `LOCATION:${s.location.replace(/[\n,;]/g, " ")}` : "",
            s.memo ? `DESCRIPTION:${s.memo.replace(/[\n,;]/g, " ")}` : "",
            "END:VEVENT"].filter(Boolean).join("\r\n")
        );
      }
    }
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UniversityTap//Timetable//JP",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetable-${startDate}-${weeks}weeks.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ICSファイルをダウンロードしました。Googleカレンダーで取り込んでください");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Googleカレンダーに同期</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            指定した週から○週分の時間割をICSファイルでダウンロードし、Googleカレンダーで「設定→インポート」から取り込んでください。
          </p>
          <div>
            <Label>開始日(月曜推奨)</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>週数</Label>
            <Select value={String(weeks)} onValueChange={(v) => setWeeks(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 4, 8, 12, 16].map((w) => <SelectItem key={w} value={String(w)}>{w}週分</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={downloadIcs}><Download className="h-4 w-4 mr-1" />ダウンロード</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}