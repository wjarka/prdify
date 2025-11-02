/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types.ts";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const e2eUsername = process.env.E2E_USERNAME;
  const e2ePassword = process.env.E2E_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "⚠️  SUPABASE_URL lub SUPABASE_KEY nie są zdefiniowane w .env.test. Pomijanie czyszczenia bazy danych."
    );
    return;
  }

  if (!e2eUsername || !e2ePassword) {
    console.warn(
      "⚠️  E2E_USERNAME lub E2E_PASSWORD nie są zdefiniowane w .env.test. Pomijanie czyszczenia bazy danych."
    );
    return;
  }

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    console.log("🔐 Logowanie do Supabase jako użytkownik testowy...");

    // Zaloguj się jako użytkownik testowy, aby uniknąć problemów z RLS
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: e2eUsername,
      password: e2ePassword,
    });

    if (authError || !authData.user) {
      console.error("❌ Błąd podczas logowania:", authError?.message || "Brak danych użytkownika");
      return;
    }

    console.log(`✅ Zalogowano jako użytkownik: ${authData.user.email}`);

    console.log("🧹 Czyszczenie bazy danych po testach E2E...");

    // Najpierw znajdź wszystkie PRD należące do zalogowanego użytkownika
    const { data: userPrds, error: fetchError } = await supabase.from("prds").select("id");

    if (fetchError) {
      console.error("❌ Błąd podczas pobierania PRD użytkownika:", fetchError.message);
      return;
    }

    if (!userPrds || userPrds.length === 0) {
      console.log("ℹ️  Brak PRD do usunięcia dla użytkownika testowego");
      return;
    }

    const prdIds = userPrds.map((prd) => prd.id);

    // Najpierw usuń wpisy z prd_questions (ze względu na foreign key constraint)
    const { error: questionsError } = await supabase.from("prd_questions").delete().in("prd_id", prdIds);

    if (questionsError) {
      console.error("❌ Błąd podczas usuwania wpisów z prd_questions:", questionsError.message);
    } else {
      console.log(`✅ Usunięto wpisy z tabeli prd_questions dla ${prdIds.length} PRD`);
    }

    // Następnie usuń wpisy z prds (RLS automatycznie przefiltruje tylko rekordy użytkownika)
    const { error: prdsError } = await supabase.from("prds").delete().in("id", prdIds);

    if (prdsError) {
      console.error("❌ Błąd podczas usuwania wpisów z prds:", prdsError.message);
    } else {
      console.log(`✅ Usunięto ${prdIds.length} wpisów z tabeli prds`);
    }

    console.log("✨ Czyszczenie bazy danych zakończone");
  } catch (error) {
    console.error("❌ Nieoczekiwany błąd podczas czyszczenia bazy danych:", error);
  }
}

export default globalTeardown;
