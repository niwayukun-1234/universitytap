export const CAMPUSES = [
  { id: "imadegawa", name: "今出川キャンパス" },
  { id: "kyotanabe", name: "京田辺キャンパス" },
  { id: "karasuma", name: "烏丸キャンパス" },
  { id: "shinmachi", name: "新町キャンパス" },
] as const;

export const campusName = (id: string | null | undefined) =>
  CAMPUSES.find((c) => c.id === id)?.name ?? "キャンパス";

/** "良心館 RY265" → "RY265"（教室名から館名を外す） */
export const roomLabel = (roomName: string, buildingName?: string | null) =>
  buildingName && roomName.startsWith(buildingName) ? roomName.slice(buildingName.length).trim() || roomName : roomName;

/**
 * 教室名から階を推定する。
 * "致遠館 101" → 1、"RY265" → 2、"B103" / "地下1" → -1、数字が無ければ 1
 */
export const parseFloor = (roomName: string, buildingName?: string | null): number => {
  const label = roomLabel(roomName, buildingName);
  if (/^(B|地下)/i.test(label)) return -1;
  const digits = label.match(/\d+/)?.[0];
  if (!digits) return 1;
  return digits.length >= 3 ? Number(digits[0]) || 1 : 1;
};

export const floorLabel = (floor: number) => (floor < 0 ? `地下${-floor}階` : `${floor}階`);

export const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatDuration = (start: string, end: string | null) => {
  const min = Math.max(0, Math.round(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 60000));
  if (min < 60) return `${min}分`;
  return `${Math.floor(min / 60)}時間${min % 60}分`;
};
