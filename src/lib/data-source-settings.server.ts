import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AdapterSource } from "@/lib/adapters/types";

export type DataSourceSetting = {
  source: AdapterSource;
  mode: "mock" | "sandbox";
  base_url: string | null;
};

const SOURCES = ["gst", "upi", "aa", "epfo", "electricity"] as const;

function defaultSetting(source: AdapterSource): DataSourceSetting {
  return { source, mode: "mock", base_url: null };
}

function defaultSettings(): Record<AdapterSource, DataSourceSetting> {
  return SOURCES.reduce((acc, source) => {
    acc[source] = defaultSetting(source);
    return acc;
  }, {} as Record<AdapterSource, DataSourceSetting>);
}

function isMissingSettingsTable(error: { code?: string; message?: string; details?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (text.includes("data_source_settings") && /schema cache|does not exist|not find/i.test(text))
  );
}

export async function getDataSourceSetting(source: AdapterSource): Promise<DataSourceSetting> {
  const { data, error } = await supabaseAdmin
    .from("data_source_settings")
    .select("source, mode, base_url")
    .eq("source", source)
    .maybeSingle();

  if (isMissingSettingsTable(error)) return defaultSetting(source);
  if (error) throw new Error(error.message);

  if (!data) {
    return defaultSetting(source);
  }

  return {
    source: data.source as AdapterSource,
    mode: data.mode === "sandbox" ? "sandbox" : "mock",
    base_url: data.base_url ?? null,
  };
}

export async function getAllDataSourceSettings(): Promise<Record<AdapterSource, DataSourceSetting>> {
  const { data, error } = await supabaseAdmin
    .from("data_source_settings")
    .select("source, mode, base_url");

  if (isMissingSettingsTable(error)) return defaultSettings();
  if (error) throw new Error(error.message);

  const settings = (data ?? []).reduce((acc, row) => {
    const source = row.source as AdapterSource;
    acc[source] = {
      source,
      mode: row.mode === "sandbox" ? "sandbox" : "mock",
      base_url: row.base_url ?? null,
    };
    return acc;
  }, {} as Record<AdapterSource, DataSourceSetting>);

  for (const source of SOURCES) {
    if (!settings[source]) {
      settings[source] = defaultSetting(source);
    }
  }
  return settings;
}
