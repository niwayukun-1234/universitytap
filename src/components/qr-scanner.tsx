import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/** カメラでQRコードを読み取る（BarcodeDetector 対応ブラウザのみ） */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // 親の再描画でカメラが再起動しないよう、コールバックは ref で持つ
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor) {
      setError("この端末のブラウザはQR読み取りに対応していません。カメラアプリで招待QRを読み取ってください。");
      return;
    }
    const detector = new Ctor({ formats: ["qr_code"] });
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let done = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = s;
        v.play();
        timer = setInterval(async () => {
          if (done || v.readyState < 2) return;
          const codes = await detector.detect(v).catch(() => []);
          if (codes[0]?.rawValue) {
            done = true;
            onResultRef.current(codes[0].rawValue);
          }
        }, 400);
      })
      .catch(() => setError("カメラを起動できませんでした。ブラウザのカメラ許可を確認してください。"));

    return () => {
      done = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[28px] bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">QRコードを読み取る</h2>
          <button type="button" onClick={onClose} aria-label="閉じる" className="flex h-10 w-10 items-center justify-center rounded-xl border border-border">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{error}</p>
        ) : (
          <video ref={videoRef} playsInline muted className="mt-4 aspect-square w-full rounded-2xl bg-black object-cover" />
        )}
      </div>
    </div>
  );
}

/** QRの中身（招待URL or ID）からフレンドコードを取り出す */
export function extractInviteCode(text: string): string | null {
  const t = text.trim();
  const m = t.match(/\/invite\/([0-9A-Za-z]+)/) ?? t.match(/[?&]invite=([0-9A-Za-z]+)/);
  if (m) return m[1];
  return /^[0-9A-Za-z]{6,12}$/.test(t) ? t : null;
}
