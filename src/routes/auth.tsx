import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const TERMS = `【ユニバーシティタップ 利用規約】

第1条（適用）
本規約は、本サービスの利用に関する一切の関係に適用されます。

第2条（利用登録）
本サービスは大学生を対象とし、登録時に在籍大学を選択してください。現在は同志社大学のみ対応しております。

第3条(個人情報の取り扱い)
位置情報・時間割・チャット内容は、登録ユーザー本人およびフレンドのみが閲覧可能です。フレンド以外の他ユーザーの個人情報は閲覧できません。

第4条(禁止事項)
他者へのなりすまし、虚偽情報の登録、迷惑行為などを禁止します。

第5条(免責事項)
本サービスにより生じた損害について、運営は責任を負いません。

第6条(規約の変更)
本規約は予告なく変更されることがあります。`;

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app/location" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary">ユニバーシティタップ</h1>
          <p className="text-sm text-muted-foreground mt-1">大学キャンパスでつながろう</p>
        </div>
        <Card>
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="signup">新規会員登録</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login"><LoginForm /></TabsContent>
              <TabsContent value="signup"><SignupForm /></TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("ログインしました");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="li-email">メールアドレス</Label>
        <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="li-pw">パスワード</Label>
        <Input id="li-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "..." : "ログイン"}
      </Button>
    </form>
  );
}

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [universityId, setUniversityId] = useState("doshisha");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return toast.error("利用規約に同意してください");
    if (universityId !== "doshisha") return toast.error("現在は同志社大学のみご利用いただけます");
    if (!fullName.trim()) return toast.error("氏名を入力してください");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app/location`,
        data: { full_name: fullName, university_id: universityId },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("確認メールを送信しました。メール内のリンクをクリックしてサービスを利用開始してください。", { duration: 8000 });
      setFullName(""); setEmail(""); setPassword(""); setAgreed(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="su-name">氏名</Label>
        <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="例: 山田 太郎" />
      </div>
      <div>
        <Label htmlFor="su-uni">大学</Label>
        <Select value={universityId} onValueChange={setUniversityId}>
          <SelectTrigger id="su-uni"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="doshisha">同志社大学</SelectItem>
            <SelectItem value="kyoto">京都大学(準備中)</SelectItem>
          </SelectContent>
        </Select>
        {universityId === "kyoto" && (
          <p className="text-xs text-destructive mt-1">京都大学は現在ご利用いただけません</p>
        )}
      </div>
      <div>
        <Label htmlFor="su-email">メールアドレス</Label>
        <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="su-pw">パスワード</Label>
        <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
        <Label htmlFor="terms" className="text-sm font-normal leading-relaxed">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary underline">利用規約</button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>利用規約</DialogTitle></DialogHeader>
              <ScrollArea className="h-80 pr-4">
                <pre className="whitespace-pre-wrap text-sm font-sans">{TERMS}</pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          に同意します
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "..." : "はじめる"}
      </Button>
    </form>
  );
}