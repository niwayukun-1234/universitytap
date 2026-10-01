import type { User } from "@supabase/supabase-js";
import type { ActiveCheckin, FriendProfile } from "@/lib/friends";
import { getLastRead } from "@/lib/unread";

/*
 * ゲスト（匿名ログイン）向けのデモデータ。
 * データベースには書き込まず、この端末のメモリ上だけで動く。
 * デモ用の ID はすべて "demo-" で始まる。
 */

export const isGuest = (user: User | null | undefined) => !!user?.is_anonymous;
export const isDemoId = (id: string | null | undefined) => !!id && id.startsWith("demo-");

type DemoFriend = FriendProfile & { circle: string | null; seminar: string | null };

export const DEMO_FRIENDS: DemoFriend[] = [
  {
    id: "demo-haruka",
    full_name: "佐藤 はるか",
    avatar_url: null,
    faculty: "経済学部",
    department: "経済学科",
    university_id: "doshisha",
    circle: "テニスサークル",
    seminar: "マクロ経済ゼミ",
  },
  {
    id: "demo-sota",
    full_name: "田中 蒼太",
    avatar_url: null,
    faculty: "商学部",
    department: "商学総合コース",
    university_id: "doshisha",
    circle: "軽音楽部",
    seminar: null,
  },
  {
    id: "demo-misaki",
    full_name: "鈴木 美咲",
    avatar_url: null,
    faculty: "文学部",
    department: "英文学科",
    university_id: "doshisha",
    circle: "英語ディベート",
    seminar: "現代英米文学ゼミ",
  },
  {
    id: "demo-kaito",
    full_name: "山本 海斗",
    avatar_url: null,
    faculty: "理工学部",
    department: "情報システムデザイン学科",
    university_id: "doshisha",
    circle: "プログラミング研究会",
    seminar: null,
  },
];

const room = (name: string, building: string, campus = "imadegawa") => ({
  name,
  buildings: { name: building, campus },
});

const minutesAgo = (min: number) => new Date(Date.now() - min * 60000).toISOString();

/** 入室中のフレンド（入室時刻は開いた時点から逆算する） */
const CHECKINS: {
  user_id: string;
  min: number;
  memo: string | null;
  classrooms: ActiveCheckin["classrooms"];
}[] = [
  {
    user_id: "demo-haruka",
    min: 25,
    memo: "窓側の席にいます。空いてる人は来て！",
    classrooms: room("RY105", "良心館"),
  },
  { user_id: "demo-sota", min: 50, memo: "レポート作業中", classrooms: room("RY105", "良心館") },
  {
    user_id: "demo-kaito",
    min: 12,
    memo: null,
    classrooms: room("101", "知真館2号館(TC2)", "kyotanabe"),
  },
];

export function demoCheckins(ids: string[]): ActiveCheckin[] {
  return CHECKINS.filter((c) => ids.includes(c.user_id)).map((c) => ({
    user_id: c.user_id,
    memo: c.memo,
    created_at: minutesAgo(c.min),
    classrooms: c.classrooms,
  }));
}

/** フレンド詳細の入室履歴 */
export function demoHistory(friendId: string) {
  const day = 24 * 60;
  const rows = [
    { min: day + 300, stay: 90, memo: "ゼミの準備", classrooms: room("M307 講義室", "明徳館") },
    { min: 2 * day + 240, stay: 180, memo: null, classrooms: room("RY105", "良心館") },
    {
      min: 3 * day + 420,
      stay: 60,
      memo: "お昼食べてます",
      classrooms: room("ラーニング・コモンズ（2階）", "良心館"),
    },
  ];
  return rows.map((r, i) => ({
    id: `${friendId}-h${i}`,
    created_at: minutesAgo(r.min),
    left_at: minutesAgo(r.min - r.stay),
    memo: r.memo,
    classrooms: r.classrooms,
  }));
}

// ---- 時間割 ----

export type DemoSchedule = {
  id: string;
  day_of_week: number;
  period: number;
  title: string;
  category: string;
  color: string;
  location: string | null;
  memo: string | null;
};

const CLASS = "#3b82f6";
const s = (
  day_of_week: number,
  period: number,
  title: string,
  location: string | null,
  category = "class",
  color = CLASS,
): Omit<DemoSchedule, "id"> => ({
  day_of_week,
  period,
  title,
  category,
  color,
  location,
  memo: null,
});

const withIds = (owner: string, rows: Omit<DemoSchedule, "id">[]): DemoSchedule[] =>
  rows.map((r) => ({ ...r, id: `${owner}-${r.day_of_week}-${r.period}` }));

const MY_SCHEDULE = withIds("demo-me", [
  s(0, 1, "マクロ経済学", "良心館 RY101"),
  s(0, 3, "統計学入門", "明徳館 M307"),
  s(1, 2, "英語コミュニケーション", "明徳館 M401"),
  s(1, 5, "テニスサークル", "今出川グラウンド", "circle", "#10b981"),
  s(2, 2, "ミクロ経済学", "良心館 RY208"),
  s(2, 4, "情報処理演習", "良心館 RY305"),
  s(3, 3, "経済史", "良心館 RY105"),
  s(3, 6, "カフェバイト", "烏丸御池", "parttime", "#f59e0b"),
  s(4, 1, "第二外国語（中国語）", "良心館 RY402"),
  s(4, 4, "マクロ経済ゼミ", "明徳館 M307", "other", "#8b5cf6"),
  s(5, 3, "塾講師バイト", "四条烏丸", "parttime", "#f59e0b"),
]);

const FRIEND_SCHEDULES: Record<string, DemoSchedule[]> = {
  "demo-haruka": withIds("demo-haruka", [
    s(0, 1, "マクロ経済学", "良心館 RY101"),
    s(0, 2, "財政学", "良心館 RY204"),
    s(1, 5, "テニスサークル", "今出川グラウンド", "circle", "#10b981"),
    s(2, 2, "ミクロ経済学", "良心館 RY208"),
    s(3, 3, "経済史", "良心館 RY105"),
    s(4, 4, "マクロ経済ゼミ", "明徳館 M307", "other", "#8b5cf6"),
  ]),
  "demo-sota": withIds("demo-sota", [
    s(0, 2, "マーケティング論", "明徳館 M3"),
    s(1, 3, "簿記原理", "良心館 RY301"),
    s(2, 4, "情報処理演習", "良心館 RY305"),
    s(3, 2, "経営学入門", "明徳館 M401"),
    s(3, 5, "軽音楽部", "学生会館", "club", "#ef4444"),
    s(4, 3, "国際ビジネス", "良心館 RY206"),
  ]),
  "demo-misaki": withIds("demo-misaki", [
    s(0, 3, "英米文学講読", "徳照館 209"),
    s(1, 2, "英語コミュニケーション", "明徳館 M401"),
    s(2, 1, "言語学概論", "明徳館 M401"),
    s(3, 4, "英語ディベート", "寒梅館 KMB301", "circle", "#10b981"),
    s(4, 2, "現代英米文学ゼミ", "徳照館 210", "other", "#8b5cf6"),
  ]),
  "demo-kaito": withIds("demo-kaito", [
    s(0, 2, "アルゴリズムとデータ構造", "知真館2号館 101", "class"),
    s(1, 1, "線形代数", "知真館1号館 201"),
    s(1, 4, "プログラミング演習", "知真館2号館 301"),
    s(2, 3, "確率統計", "知真館1号館 105"),
    s(3, 5, "プログラミング研究会", "知真館2号館 101", "circle", "#10b981"),
    s(4, 2, "情報理論", "知真館1号館 201"),
  ]),
};

/** ゲスト本人の時間割はこの端末のメモリ上で編集できる */
export function demoSchedules(ownerId: string, isMe: boolean): DemoSchedule[] {
  return isMe ? MY_SCHEDULE : (FRIEND_SCHEDULES[ownerId] ?? []);
}

export function saveDemoSchedule(item: DemoSchedule) {
  const i = MY_SCHEDULE.findIndex(
    (x) => x.day_of_week === item.day_of_week && x.period === item.period,
  );
  if (i >= 0) MY_SCHEDULE[i] = item;
  else MY_SCHEDULE.push(item);
}

export function deleteDemoSchedule(id: string) {
  const i = MY_SCHEDULE.findIndex((x) => x.id === id);
  if (i >= 0) MY_SCHEDULE.splice(i, 1);
}

// ---- チャット ----

export type DemoGroup = {
  id: string;
  name: string;
  is_direct: boolean;
  created_at: string;
  members: string[];
};
export type DemoMsg = {
  id: string;
  group_id: string;
  user_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};

/** メッセージの送り主が自分のときはこの値（表示時にゲストの ID に置き換える） */
const ME = "demo-me";

const dmId = (friendId: string) => `demo-dm-${friendId.replace(/^demo-/, "")}`;

let groups: DemoGroup[] | null = null;
let messages: DemoMsg[] | null = null;
let seq = 0;

// 時刻を開いた時点から逆算するため、最初に使うときに作る
function ensureChat() {
  if (groups && messages) return;
  groups = [
    ...DEMO_FRIENDS.map((f) => ({
      id: dmId(f.id),
      name: f.full_name,
      is_direct: true,
      created_at: minutesAgo(7 * 24 * 60),
      members: [ME, f.id],
    })),
    {
      id: "demo-group-seminar",
      name: "マクロ経済ゼミ",
      is_direct: false,
      created_at: minutesAgo(10 * 24 * 60),
      members: [ME, "demo-haruka", "demo-misaki", "demo-sota"],
    },
    {
      id: "demo-group-tennis",
      name: "テニサー同期",
      is_direct: false,
      created_at: minutesAgo(20 * 24 * 60),
      members: [ME, "demo-haruka", "demo-kaito"],
    },
  ];
  const rows: [string, string, number, string][] = [
    [dmId("demo-haruka"), "demo-haruka", 180, "明日のマクロ経済、小テストあるって！"],
    [dmId("demo-haruka"), ME, 170, "え、範囲どこまでだっけ？"],
    [dmId("demo-haruka"), "demo-haruka", 165, "第5回までのIS-LM分析のとこ"],
    [dmId("demo-haruka"), "demo-haruka", 30, "いま良心館のRY105で勉強してるよ〜"],
    [dmId("demo-haruka"), "demo-haruka", 28, "よかったら一緒にやろ！"],
    [dmId("demo-sota"), ME, 1500, "情報処理演習の課題終わった？"],
    [dmId("demo-sota"), "demo-sota", 1440, "まだ半分くらい…金曜までだよね"],
    [dmId("demo-sota"), "demo-sota", 55, "3限終わったら学食行かない？"],
    [dmId("demo-misaki"), "demo-misaki", 2900, "英語コミュニケーションのプレゼン、同じ班だね！"],
    [dmId("demo-misaki"), ME, 2880, "よろしく！テーマ決めよう"],
    [dmId("demo-misaki"), "demo-misaki", 2870, "了解！また時間割見て空きコマ合わせよう"],
    [dmId("demo-kaito"), "demo-kaito", 4400, "今度京田辺のプログラミング研究会、見学来る？"],
    [dmId("demo-kaito"), ME, 4380, "行きたい！木曜の5限だよね"],
    ["demo-group-seminar", "demo-misaki", 600, "金曜4限のゼミ、発表順どうする？"],
    ["demo-group-seminar", "demo-haruka", 580, "私トップバッターでいいよ"],
    ["demo-group-seminar", "demo-sota", 300, "レジュメ印刷しておきます！"],
    ["demo-group-seminar", "demo-misaki", 40, "ありがとう〜助かる🙏"],
    ["demo-group-tennis", "demo-kaito", 3000, "今週の練習、雨だったら中止らしい"],
    ["demo-group-tennis", "demo-haruka", 90, "火曜5限のあとグラウンド集合ね🎾"],
  ];
  messages = rows.map(([group_id, user_id, min, content], i) => ({
    id: `demo-msg-${i}`,
    group_id,
    user_id,
    content,
    attachment_url: null,
    attachment_type: null,
    created_at: minutesAgo(min),
  }));
}

const forMe = (m: DemoMsg, myId: string) => (m.user_id === ME ? { ...m, user_id: myId } : m);

export function demoDirectChatId(friendId: string) {
  return dmId(friendId);
}

export function demoGroups(): DemoGroup[] {
  ensureChat();
  return groups!;
}

export function demoGroup(id: string): DemoGroup | undefined {
  return demoGroups().find((g) => g.id === id);
}

export function demoMessages(groupId: string, myId: string): DemoMsg[] {
  ensureChat();
  return messages!.filter((m) => m.group_id === groupId).map((m) => forMe(m, myId));
}

/** 各グループの最新メッセージ */
export function demoLatest(myId: string): Record<string, DemoMsg> {
  ensureChat();
  const latest: Record<string, DemoMsg> = {};
  for (const m of messages!)
    if (!latest[m.group_id] || m.created_at > latest[m.group_id].created_at)
      latest[m.group_id] = forMe(m, myId);
  return latest;
}

/** 未読数（既読位置は本物のチャットと同じく localStorage） */
export function demoUnread(myId: string): Record<string, number> {
  ensureChat();
  const counts: Record<string, number> = {};
  // 最初は直近1時間のメッセージだけを未読にする
  const initial = minutesAgo(60);
  for (const m of messages!) {
    if (m.user_id === ME) continue;
    const last = getLastRead(myId, m.group_id) ?? initial;
    if (m.created_at > last) counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
  }
  return counts;
}

export function addDemoMessage(groupId: string, userId: string | null, content: string): DemoMsg {
  ensureChat();
  const m: DemoMsg = {
    id: `demo-msg-new-${++seq}`,
    group_id: groupId,
    user_id: userId ?? ME,
    content,
    attachment_url: null,
    attachment_type: null,
    created_at: new Date().toISOString(),
  };
  messages!.push(m);
  return m;
}

export function addDemoGroup(name: string, memberIds: string[]): DemoGroup {
  ensureChat();
  const g: DemoGroup = {
    id: `demo-group-new-${++seq}`,
    name,
    is_direct: false,
    created_at: new Date().toISOString(),
    members: [ME, ...memberIds],
  };
  groups!.push(g);
  return g;
}

const REPLIES = [
  "了解！",
  "いいね👍",
  "ありがとう！",
  "あとで見とくね",
  "ちょうど今そっち向かってる！",
  "OK〜",
];

/** デモ相手からの返信（自分以外のメンバーの誰か） */
export function demoReply(groupId: string): DemoMsg | null {
  const others = (demoGroup(groupId)?.members ?? []).filter((id) => id !== ME);
  if (others.length === 0) return null;
  const who = others[Math.floor(Math.random() * others.length)];
  return addDemoMessage(groupId, who, REPLIES[Math.floor(Math.random() * REPLIES.length)]);
}
