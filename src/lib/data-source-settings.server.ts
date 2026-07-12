import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AdapterSource } from "@/lib/adapters/types";

export type DataSourceSetting = {
  source: AdapterSource;
  mode: "mock" | "sandbox";
  base_url: string | null;
};

export async function getDataSourceSetting(source: AdapterSource): Promise<DataSourceSetting> {
  const { data, error } = await supabaseAdmin
    .from("data_source_settings")
    .select("source, mode, base_url")
    .eq("source", source)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return { source, mode: "mock", base_url: null };
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

  for (const source of ["gst", "upi", "aa", "epfo", "electricity"] as const) {
    if (!settings[source]) {
      settings[source] = { source, mode: "mock", base_url: null };
    }
  }
  return settings;
}
