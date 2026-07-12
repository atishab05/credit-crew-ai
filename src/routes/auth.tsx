import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/" });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, branch: branch || "Main Branch" },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now.");
  };

  const google = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error(String(res.error.message ?? res.error));
    else if (!res.redirected) navigate({ to: "/" });
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex bg-hero text-primary-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
          <ShieldCheck className="h-5 w-5 text-accent" /> CreditCrew AI
        </div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Underwrite credit-invisible MSMEs with a crew of AI specialists.
          </h1>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Eight specialist agents evaluate seven alternative data sources — GST, UPI, Account Aggregator, EPFO, Electricity, Fuel and Digital Footprint — in parallel. You decide.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-primary-foreground/80">
            <li>• Seven alternative data sources, zero bureau dependency</li>
            <li>• Explainable Financial Health Card with UPI transaction patterns</li>
            <li>• Full audit trail on every decision</li>
            <li>• Human-in-the-loop by design</li>
          </ul>
        </div>
        <div className="text-xs text-primary-foreground/60">
          IDBI Innovate 2026 Hackathon proof of concept — synthetic sandbox data.
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-elevated">
          <CardHeader>
            <CardTitle>Sign in to CreditCrew AI</CardTitle>
            <CardDescription>Loan officer workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" onClick={signIn} disabled={loading}>Sign in</Button>
                <div className="relative py-2 text-center text-xs text-muted-foreground">
                  <span className="bg-card px-2 relative z-10">or</span>
                  <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Branch</Label><Input placeholder="e.g. Bandra East" value={branch} onChange={(e) => setBranch(e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" onClick={signUp} disabled={loading}>Create account</Button>
                <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
              </TabsContent>
            </Tabs>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link to="/" className="underline">Back to home</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
