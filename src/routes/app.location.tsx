import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, LogIn, ChevronLeft, History, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/location")({
  component: LocationPage,
});

type Building = { id: string; name: string; campus: string };
type Classroom = { id: string; name: string; building_id: string };
type CurrentCheckin = { id: string; classroom_id: string; memo: string; classrooms: { name: string } | null };
type HistoryRow = {
  id: string;
  created_at: string;
  left_at: string | null;
  memo: string | null;
  classrooms: { name: string } | null;
};

const CAMPUSES = [
  { id: "imadegawa", name: "今出川キャンパス" },
  { id: "kyotanabe", name: "京田辺キャンパス" },
  { id: "karasuma", name: "烏丸キャンパス" },
  { id: "shinmachi", name: "新町キャンパス" },
] as const;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

const formatDuration = (start: string, end: string | null) => {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const min = Math.max(0, Math.round((e - s) / 60000));
  if (min < 60) return `${min}分`;
  return `${Math.floor(min / 60)}時間${min % 60}分`;
};

// Floor parsing: room name like "致遠館 101" → floor 1
const parseFloor = (name: string, buildingName: string): number => {
  const num = name.replace(buildingName, "").trim();
  const first = num.charAt(0);
  const f = parseInt(first, 10);
  return isNaN(f) ? 1 : f;
};

function LocationPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [current, setCurrent] = useState<CurrentCheckin | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [target, setTarget] = useState<Classroom | null>(null);
  const [memo, setMemo] = useState("");
  const [campus, setCampus] = useState<string>("imadegawa");
  const [building, setBuilding] = useState<Building | null>(null);
  const [floor, setFloor] = useState<number | null>(null);

  const loadData = async () => {
    const [b, c, cur, hist] = await Promise.all([
      supabase.from("buildings").select("id,name,campus").eq("university_id", "doshisha").order("name"),
      supabase.from("classrooms").select("id,name,building_id").eq("university_id", "doshisha").order("name"),
      supabase
        .from("checkins")
        .select("id, classroom_id, memo, classrooms(name)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("checkins")
        .select("id, created_at, left_at, memo, classrooms(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setBuildings((b.data as Building[]) || []);
    setClassrooms((c.data as Classroom[]) || []);
    setCurrent((cur.data as unknown as CurrentCheckin) || null);
    setHistory((hist.data as unknown as HistoryRow[]) || []);
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const handleEnter = async () => {
    if (!target || !user) return;
    await supabase.from("checkins").update({ is_active: false, left_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_active", true);
    const { error } = await supabase.from("checkins").insert({
      user_id: user.id,
      classroom_id: target.id,
      memo,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success(`${target.name} に入室しました`);
    setTarget(null);
    setMemo("");
    setBuilding(null);
    setFloor(null);
    loadData();
  };

  const leave = async () => {
    if (!current) return;
    await supabase.from("checkins").update({ is_active: false, left_at: new Date().toISOString() }).eq("id", current.id);
    toast.success("退室しました");
    loadData();
  };

  const campusBuildings = buildings.filter((b) => b.campus === campus);
  const buildingRooms = building ? classrooms.filter((c) => c.building_id === building.id) : [];
  const floors = building
    ? Array.from(new Set(buildingRooms.map((c) => parseFloor(c.name, building.name)))).sort((a, b) => a - b)
    : [];
  const floorRooms = building && floor != null
    ? buildingRooms.filter((c) => parseFloor(c.name, building.name) === floor)
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />現在の居場所</CardTitle>
        </CardHeader>
        <CardContent>
          {current ? (
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">{current.classrooms?.name}</div>
              {current.memo && <p className="text-sm text-muted-foreground">📝 {current.memo}</p>}
              {history[0] && history[0].id === current.id && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />入室: {formatTime(history[0].created_at)}(滞在 {formatDuration(history[0].created_at, null)})
                </p>
              )}
              <Button variant="outline" size="sm" onClick={leave}>退室する</Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">どの教室にもいません。下から教室をタップして入室してください。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" />入退出履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ履歴がありません。</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="border rounded-md p-2 text-sm">
                  <div className="font-medium">{h.classrooms?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatTime(h.created_at)} 〜 {h.left_at ? formatTime(h.left_at) : "在室中"}
                    <span className="ml-1">({formatDuration(h.created_at, h.left_at)})</span>
                  </div>
                  {h.memo && <div className="text-xs text-muted-foreground mt-1">📝 {h.memo}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>教室を選んで入室</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={campus} onValueChange={(v) => { setCampus(v); setBuilding(null); setFloor(null); }}>
            <TabsList className="grid grid-cols-4 w-full h-auto">
              {CAMPUSES.map((c) => (
                <TabsTrigger key={c.id} value={c.id} className="text-xs px-1 py-2 whitespace-normal leading-tight">
                  {c.name.replace("キャンパス", "")}
                </TabsTrigger>
              ))}
            </TabsList>
            {CAMPUSES.map((c) => (
              <TabsContent key={c.id} value={c.id} className="mt-3">
                {!building ? (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">館を選択</div>
                    {campusBuildings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">このキャンパスの館は準備中です。</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {campusBuildings.map((b) => (
                          <Button key={b.id} variant="outline" onClick={() => { setBuilding(b); setFloor(null); }}>
                            {b.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : floor == null ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setBuilding(null)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />館
                      </Button>
                      <div className="text-sm font-semibold">{building.name} - 階を選択</div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {floors.map((f) => (
                        <Button key={f} variant="outline" onClick={() => setFloor(f)}>
                          {f}階
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Button variant="ghost" size="sm" onClick={() => setFloor(null)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />階
                      </Button>
                      <div className="text-sm font-semibold">{building.name} {floor}階</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {floorRooms.map((c) => (
                        <Button key={c.id} variant="outline" size="sm" onClick={() => { setTarget(c); setMemo(""); }}>
                          <LogIn className="h-3 w-3 mr-1" />
                          {c.name.replace(building.name + " ", "")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{target?.name} に入室</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">メモ(任意)</label>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: 〇〇の授業中" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>キャンセル</Button>
            <Button onClick={handleEnter}>入室</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}