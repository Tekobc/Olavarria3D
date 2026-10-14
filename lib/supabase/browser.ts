"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/types";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Configurá Supabase antes de usar el panel de administración.");
  }

  return createBrowserClient<Database>(config.url, config.publishableKey);
}
