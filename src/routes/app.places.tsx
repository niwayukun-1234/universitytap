import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/app/places")({
  component: PlacesPage,
});

type Row = {
  classroom_id: string;
  classrooms: { name: string; building_id: string } | null;
  user_id: string;
  memo: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

function PlacesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      // friend ids
      const { data: f } = await supabase.from("friends").select("friend_id").eq("user_id", user!.id).eq("status", "accepted");
      const ids = [user!.id, ...((f ?? []).map((x) => x.friend_id))];
      const [{ data: ck }, { data: profs }, { data: b }] = await Promise.all([
        supabase.from("checkins").select("classroom_id, user_id, memo, classrooms(name, building_id)").in("user_id", ids).eq("is_active", true),
        supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids),
        supabase.from("buildings").select("id,name").eq("university_id", "doshisha").order("name"),
      ]);
      setBuildings(b || []);
      const merged: Row[] = (ck as any[] || []).map((r) => ({
        ...r,
        profiles: (profs as any[])?.find((p: any) => p.id === r.user_id) ?? null,
      }));
      setRows(merged);
    })();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />どの教室に誰がいるか</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">現在、誰もタップしていません</p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {buildings.map((b) => {
              const inBuilding = rows.filter((r) => r.classrooms?.building_id === b.id);
              if (inBuilding.length === 0) return null;
              const grouped = inBuilding.reduce<Record<string, Row[]>>((acc, r) => {
                const k = r.classrooms?.name || "?";
                acc[k] = acc[k] || [];
                acc[k].push(r);
                return acc;
              }, {});
              return (
                <AccordionItem key={b.id} value={b.id}>
                  <AccordionTrigger>{b.name} ({inBuilding.length}人)</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([room, list]) => (
                        <div key={room} className="border rounded-lg p-3">
                          <div className="font-semibold text-primary mb-2">{room}</div>
                          <div className="space-y-1">
                            {list.map((r) => (
                              <div key={r.user_id} className="flex items-center gap-2 text-sm">
                                <Avatar className="h-6 w-6">
                                  {r.profiles?.avatar_url && <AvatarImage src={r.profiles.avatar_url} />}
                                  <AvatarFallback className="text-xs">{r.profiles?.full_name?.slice(0, 1) || "?"}</AvatarFallback>
                                </Avatar>
                                <span>{r.profiles?.full_name || "?"}</span>
                                {r.memo && <span className="text-xs text-muted-foreground">— {r.memo}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}