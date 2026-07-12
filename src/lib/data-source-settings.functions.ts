import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { AdapterSource } from "@/lib/adapters/types";

const SOURCES = ["gst", "upi", "aa", "epfo", "electricity", "fuel", "digital_footprint"] as const;
export type DataSourceSetting = {
  source: AdapterSource;
  mode: "mock" | "sandbox";
  base_url: string | null;
};

function isMissingSettingsTable(error: { code?: string; message?: string; details?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return (
    text.includes("data_source_settings") &&
    (text.includes("does not exist") || text.includes("schema cache") || text.includes("relation"))
  );
}

function defaultSettings(): Record<AdapterSource, DataSourceSetting> {
  return SOURCES.reduce(
    (acc, source) => {
      acc[source] = { source, mode: "mock", base_url: null };
      return acc;
    },
    {} as Record<AdapterSource, DataSourceSetting>,
  );
}

export const getDataSourceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("data_source_settings")
      .select("source, mode, base_url");

    if (isMissingSettingsTable(error)) return defaultSettings();
    if (error) throw new Error(error.message);

    const settings = (data ?? []).reduce((acc, row) => {
      if (SOURCES.includes(row.source as any)) {
        acc[row.source as AdapterSource] = {
          source: row.source as AdapterSource,
          mode: row.mode === "sandbox" ? "sandbox" : "mock",
          base_url: row.base_url ?? null,
        };
      }
      return acc;
    }, {} as Record<AdapterSource, DataSourceSetting>);

    for (const source of SOURCES) {
      if (!settings[source]) {
        settings[source] = { source, mode: "mock", base_url: null };
      }
    }

    return settings;
  });

export const saveDataSourceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        settings: z.array(
          z.object({
            source: z.enum(SOURCES),
            mode: z.enum(["mock", "sandbox"]),
            base_url: z.string().nullable().optional(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const upserts = data.settings.map((setting) => ({
      source: setting.source,
      mode: setting.mode,
      base_url: setting.base_url?.trim() || null,
    }));

    const { error } = await context.supabase
      .from("data_source_settings")
      .upsert(upserts, { onConflict: ["source"] });

    if (isMissingSettingsTable(error))
      throw new Error("The data_source_settings table has not been created yet. Run the latest Supabase migration to enable settings persistence.");
    if (error) throw new Error(error.message);

    const sourcesToReset = upserts.map((setting) => setting.source);
    const { error: resetError } = await context.supabase
      .from("data_connections")
      .update({ status: "pending", connected_at: null, metadata: null })
      .in("source", sourcesToReset);
    if (resetError) throw new Error(resetError.message);

    return { ok: true };
  });
