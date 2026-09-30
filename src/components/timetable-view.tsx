import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Download } from "lucide-react";
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

export function TimetableView({ userId, editable }: { userId: string; editable: boolean }) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [edit, setEdit] = useState<{ d: number; p: number; existing?: Schedule } | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("schedules").select("*").eq("user_id", userId);
    setItems((data as Schedule[]) || []);
  };
  useEffect(() => { load(); }, [userId]);

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />時間割</span>
          {editable && (
            <Button size="sm" variant="outline" onClick={() => setSyncOpen(true)}>
              <Download className="h-4 w-4 mr-1" />Googleカレンダー同期
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <table className="w-full text-[10px] sm:text-xs border-separate border-spacing-0.5 table-fixed">
          <thead>
            <tr>
              <th className="w-10 sm:w-12"></th>
              {DAYS.map((d) => <th key={d} className="font-medium text-muted-foreground py-1">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((p) => (
              <tr key={p}>
                <td className="text-center text-muted-foreground font-medium align-middle px-0">
                  <div className="font-bold text-foreground text-xs">{p}</div>
                  <div className="text-[8px] leading-none text-muted-foreground">{PERIOD_TIMES[p].split("-")[0]}</div>
                </td>
                {DAYS.map((_, d) => {
                  const s = find(d, p);
                  return (
                    <td key={d} className="align-top p-0">
                      <button
                        onClick={() => editable && setEdit({ d, p, existing: s })}
                        disabled={!editable && !s}
                        className="w-full h-12 sm:h-14 rounded p-0.5 sm:p-1 text-left transition hover:opacity-80 disabled:opacity-100 overflow-hidden"
                        style={{
                          backgroundColor: s ? s.color + "30" : "var(--muted)",
                          borderLeft: s ? `2px solid ${s.color}` : undefined,
                        }}
                      >
                        {s && (
                          <>
                            <div className="font-semibold truncate leading-tight" style={{ color: s.color }}>{s.title}</div>
                            {s.location && <div className="text-[8px] sm:text-[9px] text-muted-foreground truncate leading-tight">{s.location}</div>}
                          </>
                        )}
                        {!s && editable && <Plus className="h-3 w-3 text-muted-foreground mx-auto mt-2" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <EditDialog
        edit={edit}
        userId={userId}
        onClose={() => setEdit(null)}
        onSaved={() => { load(); setEdit(null); }}
        onExport={exportToGoogle}
      />
      {editable && <GoogleSyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} items={items} />}
    </Card>
  );
}

function EditDialog({ edit, userId, onClose, onSaved, onExport }: {
  edit: { d: number; p: number; existing?: Schedule } | null;
  userId: string;
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
    const { error } = await supabase.from("schedules").upsert(payload, { onConflict: "user_id,day_of_week,period" });
    if (error) return toast.error(error.message);
    toast.success("保存しました");
    onSaved();
  };

  const del = async () => {
    if (!edit.existing) return;
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