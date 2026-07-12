import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDataSourceSettings, saveDataSourceSettings, type DataSourceSetting } from "@/lib/data-source-settings.functions";
import { AdapterSource } from "@/lib/adapters/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SOURCES: Array<{ id: AdapterSource; label: string; description: string }> = [
  { id: "gst", label: "GST", description: "Goods and Services Tax data" },
  { id: "upi", label: "UPI", description: "Unified Payments Interface collections" },
  { id: "aa", label: "Account Aggregator", description: "AA transaction summary" },
  { id: "epfo", label: "EPFO", description: "Employee PF contributions" },
  { id: "electricity", label: "Electricity", description: "Utility consumption profile" },
];

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const fetchSettings = useServerFn(getDataSourceSettings);
  const saveSettings = useServerFn(saveDataSourceSettings);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["data-source-settings"],
    queryFn: () => fetchSettings(),
  });

  const defaultSettings = useMemo(
    () =>
      SOURCES.map((source) => ({
        source: source.id,
        mode: "mock" as const,
        base_url: null,
      })),
    [],
  );

  const [settings, setSettings] = useState<DataSourceSetting[]>(defaultSettings);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setSettings(SOURCES.map((source) => data[source.id]));
    }
  }, [data]);

  const updateSetting = (source: AdapterSource, changes: Partial<DataSourceSetting>) => {
    setSettings((current) =>
      current.map((item) => (item.source === source ? { ...item, ...changes } : item)),
    );
  };

  const handleSave = async () => {
    setStatusMessage(null);
    setSaving(true);
    try {
      await saveSettings({ settings });
      setStatusMessage("Settings saved successfully.");
    } catch (err: any) {
      setStatusMessage(err?.message ?? "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-6xl">
      <header className="space-y-2">
        <p className="text-sm text-accent font-medium">Workspace settings</p>
        <h1 className="text-3xl font-semibold">Alternative data source configuration</h1>
        <p className="text-muted-foreground max-w-2xl">
          Pick whether each alternative data source should use sandbox lookups or stay in mock mode, and configure the sandbox base URL for each source.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox & mock mode controls</CardTitle>
          <CardDescription>
            Sandbox API keys are still read from environment variables. Base URLs configured here override the defaults for sandbox mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statusMessage ? (
            <Alert>
              <AlertTitle>{statusMessage.startsWith("Settings saved") ? "Saved" : "Error"}</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Error loading settings: {(error as Error)?.message ?? "Unknown error"}
            </div>
          ) : null}

          <div className="grid gap-6">
            {settings.map((setting) => (
              <Card key={setting.source} className="border">
                <CardHeader>
                  <CardTitle>{SOURCES.find((item) => item.id === setting.source)?.label}</CardTitle>
                  <CardDescription>
                    {SOURCES.find((item) => item.id === setting.source)?.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-[220px_1fr]">
                  <div className="space-y-3">
                    <Label htmlFor={`${setting.source}-mode`}>Mode</Label>
                    <Select
                      value={setting.mode}
                      onValueChange={(value) => updateSetting(setting.source, { mode: value as DataSourceSetting["mode"] })}
                    >
                      <SelectTrigger id={`${setting.source}-mode`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mock">Mock</SelectItem>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor={`${setting.source}-base-url`}>Sandbox base URL</Label>
                    <Input
                      id={`${setting.source}-base-url`}
                      value={setting.base_url ?? ""}
                      onChange={(event) => updateSetting(setting.source, { base_url: event.target.value || null })}
                      placeholder="https://api.sandbox.example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the default sandbox URL from environment variables.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground max-w-2xl">
              When sandbox is selected, the app will attempt to use the configured base URL and the existing environment API keys. If sandbox is unavailable, the connection will fail and fall back to mock mode for future requests.
            </div>
            <Button onClick={handleSave} disabled={saving || isFetching}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
