# API Endpoint Implementation Plan: GET /api/prds/{id}

## 1. Przegląd punktu końcowego
Ten punkt końcowy służy do pobierania pojedynczego dokumentu wymagań produktowych (PRD) na podstawie jego unikalnego identyfikatora (ID). Zwraca on wszystkie kluczowe metadane PRD, w tym jego status, podsumowanie i treść, ale celowo wyklucza pełną historię pytań i odpowiedzi, aby zapewnić optymalną wydajność. Dostęp do zasobu jest ograniczony wyłącznie do uwierzytelnionego użytkownika, który jest jego właścicielem.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/prds/{id}`
- **Parametry**:
  - **Wymagane**:
    - `id` (parametr ścieżki): Identyfikator UUID PRD, który ma zostać pobrany.
  - **Opcjonalne**: Brak.
- **Request Body**: Brak.

## 3. Wykorzystywane typy
- **DTO**:
  - `PrdDto`: Obiekt transferu danych reprezentujący odpowiedź. Zawiera wszystkie pola zdefiniowane w specyfikacji, w tym `id`, `name`, `status`, `summary`, `content` oraz `currentRoundNumber`.

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (200 OK)**:
  ```json
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "My New Feature PRD",
    "mainProblem": "...",
    "inScope": "...",
    "outOfScope": "...",
    "successCriteria": "...",
    "status": "planning",
    "summary": "...",
    "content": "...",
    "currentRoundNumber": 1,
    "createdAt": "iso_timestamp",
    "updatedAt": "iso_timestamp"
  }
  ```
- **Kody statusu błędów**:
  - `400 Bad Request`
  - `401 Unauthorized`
  - `404 Not Found`
  - `500 Internal Server Error`

## 5. Przepływ danych
1.  Żądanie `GET` trafia do dynamicznego endpointa Astro `src/pages/api/prds/[id].ts`.
2.  Middleware Astro (`src/middleware/index.ts`) weryfikuje sesję użytkownika. Jeśli użytkownik nie jest uwierzytelniony, przepływ jest przerywany i zwracany jest błąd `401 Unauthorized`.
3.  Handler endpointa pobiera parametr `id` z `Astro.params`.
4.  Parametr `id` jest walidowany przy użyciu schemy Zod, aby upewnić się, że jest to prawidłowy UUID. W przypadku niepowodzenia walidacji zwracany jest błąd `400 Bad Request`.
5.  Handler wywołuje metodę `getPrdById(id)` z serwisu `PrdsService`, przekazując instancję klienta Supabase z `Astro.locals.supabase`.
6.  `PrdsService` wykonuje zapytanie do bazy danych Supabase w celu pobrania rekordu z tabeli `prds`. Zapytanie (`select().eq('id', id)`) jest automatycznie filtrowane dla zalogowanego użytkownika dzięki politykom Row Level Security (RLS).
7.  `PrdsService` wywołuje istniejącą funkcję pomocniczą `getCurrentRoundNumber(supabase, id)`, aby obliczyć aktualny numer rundy pytań.
8.  Serwis mapuje pobrany rekord z bazy danych na `PrdDto`.
9.  Jeśli RLS uniemożliwi dostęp lub rekord o danym `id` nie istnieje, zapytanie nie zwróci danych. Serwis zinterpretuje to jako `null` i przekaże do handlera, który zwróci `404 Not Found`.
10. W przypadku sukcesu, handler endpointa serializuje `PrdDto` do formatu JSON i zwraca odpowiedź z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Każde żądanie musi być uwierzytelnione. Middleware Astro będzie odpowiedzialne za weryfikację tokena sesji i odrzucenie nieautoryzowanych żądań.
- **Autoryzacja**: Głównym mechanizmem autoryzacji będzie **Row Level Security (RLS)** w Supabase. Polityki RLS zdefiniowane na tabeli `prds` zapewnią, że zapytania `SELECT` wykonywane przez uwierzytelnionego użytkownika będą automatycznie ograniczone tylko do wierszy, w których `user_id` pasuje do ID zalogowanego użytkownika. Eliminuje to potrzebę ręcznego dodawania warunku `WHERE user_id = ...` w każdym zapytaniu i stanowi solidne zabezpieczenie przed atakami typu IDOR.
- **Walidacja danych wejściowych**: Parametr `id` będzie rygorystycznie walidowany jako UUID, aby zapobiec potencjalnym atakom, takim jak SQL Injection, chociaż użycie ORM Supabase już zapewnia ochronę.

## 7. Obsługa błędów
| Scenariusz Błędu | Kod Statusu HTTP | Ciało Odpowiedzi (JSON) |
|---|---|---|
| Użytkownik nie jest uwierzytelniony. | `401 Unauthorized` | `{ "error": "Unauthorized" }` |
| Parametr `id` nie jest prawidłowym UUID. | `400 Bad Request` | `{ "error": "Invalid PRD ID format" }` |
| PRD o podanym `id` nie istnieje lub nie należy do użytkownika. | `404 Not Found` | `{ "error": "PRD not found" }` |
| Wystąpił nieoczekiwany błąd serwera. | `500 Internal Server Error` | `{ "error": "Internal Server Error" }` |

## 8. Rozważania dotyczące wydajności
- **Zapytania do bazy danych**: Endpoint wykonuje dwa oddzielne, proste zapytania: jedno do pobrania PRD i jedno do obliczenia `currentRoundNumber`. Oba zapytania wykorzystują klucze główne lub indeksowane (`prds.id`, `prds.user_id`, `prd_questions.prd_id`), co zapewnia wysoką wydajność.
- **Rozmiar odpowiedzi**: Odpowiedź nie zawiera pełnej historii pytań, co utrzymuje jej rozmiar na niskim poziomie, skracając czas transferu danych.
- **Indeksowanie**: Należy upewnić się, że kolumny `prds(id)`, `prds(user_id)` oraz `prd_questions(prd_id)` mają założone indeksy w bazie danych PostgreSQL.

## 9. Etapy wdrożenia
1.  **Walidacja**: W pliku `src/lib/validation/prds.ts`, zdefiniuj lub zaktualizuj schemę Zod do walidacji parametru `id` jako `z.string().uuid()`.
2.  **Logika Serwisu**:
    - W pliku `src/lib/services/prds.ts`, dodaj nową metodę `getPrdById(supabase: SupabaseClient, id: string): Promise<PrdDto | null>`.
    - Wewnątrz tej metody, zaimplementuj logikę pobierania PRD z bazy danych za pomocą zapytania `supabase.from('prds').select().eq('id', id).single()`. RLS automatycznie zapewni autoryzację.
    - Wywołaj istniejący helper `getCurrentRoundNumber(supabase, id)`, aby uzyskać numer rundy.
    - Zaimplementuj mapowanie wyniku z bazy na obiekt `PrdDto`, łącząc dane z obu zapytań.
3.  **Implementacja Endpointa**:
    - Utwórz nowy plik `src/pages/api/prds/[id].ts`.
    - Zdefiniuj handler `GET` dla tego endpointa.
    - Dodaj `export const prerender = false;` na początku pliku.
    - W handlerze, pobierz sesję użytkownika i klienta Supabase z `Astro.locals`. Jeśli sesja nie istnieje, zwróć odpowiedź `401`.
    - Zwaliduj parametr `Astro.params.id` przy użyciu przygotowanej schemy Zod. W razie błędu zwróć `400`.
    - Wywołaj nowo utworzoną metodę `prdsService.getPrdById(supabase, id)`.
    - Na podstawie wyniku z serwisu, zwróć odpowiedź `200 OK` z `PrdDto` lub `404 Not Found`.
    - Dodaj blok `try...catch` do obsługi nieoczekiwanych błędów i zwracania `500 Internal Server Error`.
