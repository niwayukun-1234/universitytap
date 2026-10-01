import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Map, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/brand";
import { campusName, hhmm, roomLabel } from "@/lib/campus";
import { type ActiveCheckin, type FriendProfile, acceptedFriendIds, activeCheckins, profilesByIds, withDemoFriends } from "@/lib/friends";

export const Route = createFileRoute("/app/places")({
  component: PlacesPage,
});

type RoomGroup = { key: string; label: string; people: { profile: FriendProfile | undefined; checkin: ActiveCheckin }[] };

function PlacesPage() {
  const { user } = useAuth();
  const [friendCount, setFriendCount] = useState(0);
  const [rooms, setRooms] = useState<RoomGroup[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const ids = withDemoFriends(user, await acceptedFriendIds(user.id));
      const [profs, cks] = await Promise.all([profilesByIds(ids), activeCheckins(ids)]);
      const groups: Record<string, RoomGroup> = {};
      for (const c of cks) {
        const room = c.classrooms;
        const b = room?.buildings;
        const label = room ? `${campusName(b?.campus)} / ${b ? `${b.name} ${roomLabel(room.name, b.name)}` : room.name}` : "不明な場所";
        (groups[label] ??= { key: label, label, people: [] }).people.push({ profile: profs.find((p) => p.id === c.user_id), checkin: c });
      }
      setFriendCount(ids.length);
      setRooms(Object.values(groups).sort((a, b) => b.people.length - a.people.length));
      setLoaded(true);
    })();
  }, [user]);

  const inRoom = rooms.reduce((n, r) => n + r.people.length, 0);

  return (
    <div className="space-y-5">
      <section className="ut-card">
        <div className="ut-eyebrow">場所</div>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full bg-primary shadow-[0_0_0_6px_oklch(0.36_0.16_318/0.15)]" />
          <h2 className="text-4xl font-extrabold">入室中{inRoom}人</h2>
        </div>
        <p className="mt-3 pl-7 text-lg text-muted-foreground">
          表示中の場所{rooms.length}件 / フレンド{friendCount}人
        </p>
        <Link to="/app/friends" className="ut-btn-primary mt-5 w-full rounded-full py-4 text-xl">
          フレンド
        </Link>
      </section>

      <section className="ut-card">
        <h2 className="ut-card-title border-b border-border pb-4 text-xl">
          <Map className="h-7 w-7 text-primary" />
          入室中のフレンド
        </h2>
        {!loaded ? (
          <p className="mt-4 text-muted-foreground">読み込み中...</p>
        ) : rooms.length === 0 ? (
          <p className="mt-4 text-lg text-muted-foreground">いま入室しているフレンドはいません。</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {rooms.map((r) => (
              <li key={r.key} className="ut-soft rounded-3xl p-4">
                <div className="flex gap-3">
                  <MapPin className="mt-1 h-6 w-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-extrabold text-foreground">{r.label}</div>
                    <span className="mt-2 inline-block rounded-full border border-brand-soft-border bg-card px-3 py-1 font-bold">{r.people.length}人</span>
                    <div className="mt-2 text-muted-foreground">入室中のフレンド</div>
                    <ul className="mt-2 space-y-2">
                      {r.people.map(({ profile, checkin }) => (
                        <li key={checkin.user_id}>
                          <Link to="/app/friend/$id" params={{ id: checkin.user_id }} className="flex items-center gap-3 rounded-2xl bg-card/80 p-3">
                            <UserAvatar src={profile?.avatar_url} name={profile?.full_name} className="h-12 w-12 rounded-xl" />
                            <div className="min-w-0">
                              <div className="truncate text-lg font-extrabold text-foreground">{profile?.full_name ?? "フレンド"}</div>
                              <div className="text-muted-foreground">入室 {hhmm(checkin.created_at)}</div>
                              {checkin.memo && <div className="truncate text-sm text-foreground">📝 {checkin.memo}</div>}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
