# API Endpoint Implementation Plan: PATCH /api/prds/{id}

## 1. Przegląd punktu końcowego
Ten punkt końcowy umożliwia użytkownikom aktualizację metadanych istniejącego dokumentu wymagań produktowych (PRD). Obecnie jedynym polem, które można modyfikować, jest nazwa (`name`) dokumentu. Operacja jest dostępna tylko dla uwierzytelnionego właściciela dokumentu i niemożliwa do wykonania, jeśli PRD ma status `completed`.

## 2. Szczegóły żądania
- **Metoda HTTP**: `PATCH`
- **Struktura URL**: `/api/prds/{id}`
- **Parametry ścieżki**:
  - `id` (string, format UUID): **Wymagany**. Unikalny identyfikator PRD, które ma zostać zaktualizowane.
- **Ciało żądania (Request Body)**:
  - Typ: `application/json`
  - Struktura:
    ```json
    {
      "name": "Nowa nazwa dla PRD"
    }
    ```
  - Pola:
    - `name` (string): **Opcjonalny**. Nowa nazwa dla PRD. Jeśli zostanie podana, nie może być pusta.

## 3. Wykorzystywane typy
- **Command Model**: `UpdatePrdCommand` (z `src/types.ts`) będzie używany do typowania danych wejściowych z ciała żądania.
  ```typescript
  export type UpdatePrdCommand = Partial<Pick<PrdDto, "name">>;
  ```
- **Data Transfer Object**: `PrdDto` (z `src/types.ts`) będzie używany do strukturyzacji danych w odpowiedzi.

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (200 OK)**:
  - Zwraca pełny, zaktualizowany obiekt PRD w formacie `PrdDto`.
  - Przykład:
    ```json
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "000a0000-a00a-00aa-aa00-000a00aa0000",
      "name": "Nowa nazwa dla PRD",
      "mainProblem": "...",
      "inScope": "...",
      "outOfScope": "...",
      "successCriteria": "...",
      "status": "planning",
      "summary": null,
      "content": null,
      "currentRoundNumber": 1,
      "createdAt": "2025-10-15T10:00:00.000Z",
      "updatedAt": "2025-10-15T12:30:00.000Z"
    }
    ```
- **Odpowiedzi błędu**: Zobacz sekcję "Obsługa błędów".

## 5. Przepływ danych
1.  **Żądanie**: Klient wysyła żądanie `PATCH` na adres `/api/prds/{id}` z  ciałem zawierającym pole `name`.
2.  **Middleware (Astro)**: Będzie odpowiedzialny za autoryzację. Pomiń na razie ten aspekt.
3.  **Handler (Astro API Route)**:
    - Odbiera `id` z parametrów ścieżki i ciało żądania.
    - Waliduje `id` (musi być UUID) oraz ciało żądania przy użyciu schematu Zod. W przypadku błędu zwraca `400 Bad Request`.
    - Pobiera obiekt `supabase` z `context.locals`.
    - Wywołuje metodę `PrdsService.updatePrd`, przekazując `id` oraz zwalidowane dane.
4.  **Serwis (`PrdsService.updatePrd`)**:
    - Pobiera z bazy danych PRD o zadanym `id`. Jeśli nie istnieje, zwraca błąd `404 Not Found`.
    - Sprawdza, czy `prd.status` jest równy `completed`. Jeśli tak, zwraca błąd `409 Conflict`.
    - Jeśli pole `name` zostało przekazane, wykonuje zapytanie `UPDATE` do tabeli `prds` w Supabase.
    - Baza danych PostgreSQL zweryfikuje ograniczenie `UNIQUE(user_id, name)`. W przypadku naruszenia, Supabase zwróci błąd, który serwis obsłuży i przekaże jako `400 Bad Request`.
    - Po pomyślnej aktualizacji, pobiera zaktualizowany rekord z bazy.
    - Mapuje rekord na `PrdDto` i zwraca go do handlera.
5.  **Odpowiedź**: Handler odbiera `PrdDto` z serwisu i wysyła je do klienta z kodem statusu `200 OK`. W przypadku błędu z serwisu, handler mapuje go na odpowiedni kod statusu HTTP i zwraca odpowiedź błędu.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Dostęp do punktu końcowego musi być ograniczony tylko do zalogowanych użytkowników. Middleware Astro będzie odpowiedzialne za weryfikację sesji Supabase.
- **Autoryzacja**: Weryfikacja czy użytkownik ma prawo do danego PRD będzie zrealizowana przy pomocy RLS w późniejszej fazie projektu.
- **Walidacja danych wejściowych**:
  - Parametr `id` musi być walidowany jako UUID, aby zapobiec błędom w zapytaniach do bazy danych.
  - Ciało żądania musi być walidowane przy użyciu Zod, aby upewnić się, że `name` jest stringiem.

## 7. Obsługa błędów
Punkt końcowy musi obsługiwać następujące scenariusze błędów, zwracając odpowiednie kody statusu HTTP i komunikaty:
- `400 Bad Request`:
  - `id` nie jest w formacie UUID.
  - Ciało żądania jest nieprawidłowe (np. `name` nie jest stringiem).
  - Podana nazwa `name` jest pusta.
  - Podana nazwa `name` już istnieje dla tego użytkownika (naruszenie unikalności).
- `401 Unauthorized`: Użytkownik nie jest uwierzytelniony.
- `403 Forbidden`: Użytkownik próbuje zmodyfikować PRD, którego nie jest właścicielem.
- `404 Not Found`: Nie znaleziono PRD o podanym `id`.
- `409 Conflict`: PRD jest w stanie `completed` i nie można go modyfikować.
- `500 Internal Server Error`: Wystąpił nieoczekiwany błąd po stronie serwera (np. błąd połączenia z bazą danych).


## 8. Etapy wdrożenia
1.  **Definicja schematu walidacji Zod**:
    - W pliku `src/lib/schemas/prds.ts` (lub podobnym) utwórz schemat Zod dla `UpdatePrdCommand`.
    ```typescript
    export const updatePrdSchema = z.object({
      name: z.string().min(1, "Name cannot be empty.").optional(),
    });
    ```
2.  **Rozszerzenie `PrdsService`**:
    - W pliku `src/lib/services/prds.ts` dodaj nową metodę `updatePrd(supabase: SupabaseClient, id: string, command: UpdatePrdCommand)`.
    - Zaimplementuj w niej logikę opisaną w sekcji "Przepływ danych", włączając w to pobieranie danych, weryfikację uprawnień i statusu, oraz aktualizację rekordu w Supabase.
    - Zadbaj o mapowanie błędów z Supabase (np. naruszenie unikalności) na odpowiednie wyjątki lub kody błędów.
3.  **Implementacja handlera API**:
    - W pliku `src/pages/api/prds/[id].ts` utwórz lub zaktualizuj handler dla metody `PATCH`.
    - Zaimplementuj walidację parametru `id` i ciała żądania za pomocą Zod.
    - Dodaj obsługę wywołania serwisu `PrdsService.updatePrd`.
    - Zaimplementuj obsługę błędów i zwracanie odpowiednich odpowiedzi HTTP na podstawie wyników z serwisu.