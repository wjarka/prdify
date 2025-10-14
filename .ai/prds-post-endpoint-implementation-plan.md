# API Endpoint Implementation Plan: POST /api/prds

## 1. Przegląd punktu końcowego
- Cel: utworzenie nowego dokumentu PRD dla uwierzytelnionego użytkownika.
- Zakres: zapisanie rekordu w tabeli `prds` ze stanem początkowym (`status=planning`, `summary=null`, `content=null`, licznik rund = 0).
- Kontekst: endpoint nie inicjuje sesji pytań; po otrzymaniu `201` klient wywołuje `POST /api/prds/{id}/questions/generate`.
- Technologie: Astro API route (`src/pages/api/prds/index.ts`), Supabase (RLS), TypeScript 5, Zod walidacja.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/prds`
- Parametry
  - Wymagane: brak parametrów ścieżki i zapytania.
  - Opcjonalne: brak.
- Request Body (`application/json`):
  - `name`: string, wymagany, niepusty po `trim`, sugerowany limit `≤ 200` znaków.
  - `mainProblem`: string, wymagany, niepusty, sugerowany limit `≤ 5000`.
  - `inScope`: string, wymagany, niepusty, sugerowany limit `≤ 5000`.
  - `outOfScope`: string, wymagany, niepusty, sugerowany limit `≤ 5000`.
  - `successCriteria`: string, wymagany, niepusty, sugerowany limit `≤ 2000`.
- Walidacja: Zod schema (`createPrdSchema`) obejmuje `trim`, `min(1)` oraz limity długości.
- Autoryzacja: wymagana sesja Supabase; korzystamy z `locals.supabase` oraz `locals.user` dostarczonych przez middleware.
- DTO/typy wejścia: `CreatePrdCommand` (`src/types.ts`), opcjonalnie lokalny `CreatePrdDbInput` do mapowania na snake_case.

## 3. Szczegóły odpowiedzi
- Sukces: `201 Created` z `Content-Type: application/json`.
- Body: obiekt zgodny z `PrdDto` (`src/types.ts`), z polami camelCase i `currentRoundNumber: 0`.
- Nagłówek: `Location: /api/prds/{newId}` (zalecane).
- Kody błędów:
  - `400 Bad Request`: walidacja nie powiodła się.
  - `401 Unauthorized`: brak uwierzytelnionej sesji.
  - `500 Internal Server Error`: błąd serwera / Supabase.
- Typy wyjściowe: `PrdDto`, `PrdStatus` dla pola `status`.

## 4. Przepływ danych
1. Middleware (`src/middleware/index.ts`) zapewnia `locals.supabase` oraz `locals.user` (wymusza uwierzytelnienie).
2. Endpoint `POST /api/prds`:
   - Odczytuje `await request.json()`; obsługuje z góry `SyntaxError`.
   - Waliduje payload Zodem, castuje do `CreatePrdCommand`.
   - Sprawdza `locals.user?.id`; brak → `401`.
   - Wywołuje serwis `createPrd` z Supabase clientem, `userId`, commandem.
3. Serwis `createPrd` (lokalizacja: `src/lib/services/prds.ts`):
   - Mapuje dane na snake_case (`name`, `main_problem`, etc.), ustawia `user_id`, `status: 'planning'`, `summary: null`, `content: null`.
   - Wstawia rekord przez `supabase.from('prds').insert(payload).select().single()`; obsługuje `Prefer: return=representation`.
   - Tłumaczy błędy (`PostgrestError`) na kontrolowane wyjątki (np. `PrdNameConflictError`, `PrdCreationError`).
4. Endpoint mapuje wynik z snake_case na `PrdDto` (camelCase) i odsyła `201`.

## 5. Względy bezpieczeństwa
- Uwierzytelnienie: wymagane (middleware + Supabase). Brak sesji → `401`.
- Autoryzacja: RLS w `prds` wymaga zgodności `user_id`; endpoint przypisuje `user_id` z sesji, ignoruje payload.
- Walidacja danych: Zod + `trim`; ograniczenie długości chroni przed nadużyciami i minimalizuje payload.
- Sanitacja: brak bezpośredniego SQL (Supabase SDK); sprawdzać nagłówek `Content-Type` i rozmiar ciała.
- Rate limiting / throttling: odnotować potrzebę integracji (np. Astro Middleware) – poza zakresem, ale rekomendowane.
- Observability: logowanie błędów (bez danych wrażliwych). Brak tabeli błędów → log do konsoli / loggera.

## 6. Obsługa błędów
- Walidacja (Zod) → `400` z komunikatem i szczegółami.
- Brak sesji lub `locals.user` → `401` z komunikatem "User not authenticated".
- Supabase insert:
  - `PostgrestError` kod `23505` (naruszenie UNIQUE `user_id, name`) → `400` z komunikatem "PRD name must be unique per user".
  - Inne błędy → log i `500`, komunikat ogólny.
- Błąd JSON parsing (`SyntaxError`) → `400` "Invalid JSON payload".
- Serwis zwraca kontrolowane wyjątki (`PrdNameConflictError`, `PrdCreationError`) obsługiwane w handlerze.

## 7. Rozważania dotyczące wydajności
- Pojedynczy insert → niska złożoność; brak dodatkowych zapytań.
- `select().single()` ogranicza ilość danych w odpowiedzi.
- Brak potrzeby cache lub batchowania.
- Monitorować limit Supabase (retry/backoff w loggerach jeśli konieczne).

## 8. Etapy wdrożenia
1. Utwórz `createPrdSchema` w `src/lib/validation/prds.ts` (lub istniejącym katalogu walidacji)
2. Dodaj `src/lib/services/prds.ts` z funkcją `createPrd` (obsługa błędów specyficznych dla PRD) oraz re-export w indeksie usług (jeśli istnieje).
3. Rozbuduj `src/lib/utils.ts` o helpery camelCase/snakeCase (jeśli brak) lub dodaj nowe utilsy w `src/lib/mappers/prds.ts`.
4. Zaimplementuj handler `POST` w `src/pages/api/prds/index.ts`:
   - Importuj schemat i serwis.
   - Obsłuż JSON parsing, walidację, autoryzację, mapowanie odpowiedzi i kody statusu.

