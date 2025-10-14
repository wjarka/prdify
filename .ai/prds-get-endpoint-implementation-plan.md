# API Endpoint Implementation Plan: GET /api/prds

## 1. Przegląd punktu końcowego
Celem tego punktu końcowego jest umożliwienie uwierzytelnionym użytkownikom pobierania listy ich dokumentów wymagań produktowych (PRD). Endpoint obsługuje paginację i sortowanie, aby zapewnić elastyczność i wydajność.

## 2. Szczegóły żądania
- **Metoda HTTP**: `GET`
- **Struktura URL**: `/api/prds`
- **Parametry**:
  - **Opcjonalne**:
    - `page` (number, domyślnie: 1): Numer strony do paginacji.
    - `limit` (number, domyślnie: 10): Liczba elementów na stronie.
    - `sortBy` (string, domyślnie: 'updated_at'): Pole do sortowania. Dozwolone wartości: 'name', 'status', 'createdAt', 'updatedAt'.
    - `order` (string, domyślnie: 'desc'): Kierunek sortowania. Dozwolone wartości: 'asc', 'desc'.
- **Request Body**: Brak

## 3. Wykorzystywane typy
- **`PrdListItemDto`**: Reprezentuje pojedynczy PRD na liście.
  ```typescript
  export type PrdListItemDto = Pick<PrdDto, "id" | "name" | "status" | "createdAt" | "updatedAt">;
  ```
- **`PaginatedPrdsDto`**: Reprezentuje paginowaną listę PRD.
  ```typescript
  export interface PaginatedPrdsDto {
    data: PrdListItemDto[];
    pagination: Pagination;
  }
  ```
- **`Pagination`**: Reprezentuje informacje o paginacji.
  ```typescript
  export interface Pagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  }
  ```

## 4. Szczegóły odpowiedzi
- **Odpowiedź sukcesu (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "My New Feature PRD",
        "status": "planning_review",
        "createdAt": "iso_timestamp",
        "updatedAt": "iso_timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
  ```
- **Odpowiedzi błędów**:
  - `400 Bad Request`: W przypadku nieprawidłowych parametrów zapytania.
  - `401 Unauthorized`: Jeśli użytkownik nie jest uwierzytelniony.
  - `500 Internal Server Error`: W przypadku błędów serwera.

## 5. Przepływ danych
1. Żądanie `GET` przychodzi do endpointu `/api/prds`.
2. Middleware Astro weryfikuje, czy użytkownik jest uwierzytelniony, sprawdzając sesję. Jeśli nie, zwraca `401 Unauthorized`.
3. Handler endpointu w `src/pages/api/prds/index.ts` parsuje i waliduje parametry zapytania (`page`, `limit`, `sortBy`, `order`) przy użyciu schemy Zod z `src/lib/validation/prds.ts`. W przypadku błędu walidacji, zwraca `400 Bad Request`.
4. Handler wywołuje funkcję `getPrds(userId, { page, limit, sortBy, order })` z serwisu `src/lib/services/prds.ts`.
5. Funkcja `getPrds` w serwisie konstruuje i wykonuje zapytanie do bazy danych Supabase, aby pobrać PRD dla danego `userId`.
6. Zapytanie do bazy danych:
   - Pobiera liczbę wszystkich PRD dla użytkownika (`COUNT`).
   - Pobiera listę PRD z uwzględnieniem paginacji (`offset`, `limit`) i sortowania (`order`).
   - Selekcjonuje tylko wymagane pola: `id`, `name`, `status`, `createdAt`, `updatedAt`.
7. Serwis `prds.ts` oblicza dane paginacji (`totalPages`, `totalItems`) i mapuje wyniki z bazy danych na `PrdListItemDto`.
8. Serwis zwraca obiekt `PaginatedPrdsDto` do handlera endpointu.
9. Handler endpointu serializuje odpowiedź do formatu JSON i wysyła ją z kodem statusu `200 OK`.

## 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Dostęp do endpointu jest ograniczony do uwierzytelnionych użytkowników. Middleware Astro (`src/middleware/index.ts`) będzie odpowiedzialne za weryfikację tokenu sesji.
- **Autoryzacja**: Każdy użytkownik ma dostęp tylko do swoich PRD. Zapytanie do bazy danych w serwisie `prds.ts` musi zawierać klauzulę `where('user_id', '=', userId)`.
- **Walidacja danych wejściowych**: Parametry zapytania są walidowane, aby zapobiec nieoczekiwanemu zachowaniu i potencjalnym atakom (np. poprzez ograniczenie wartości `sortBy` do predefiniowanej listy kolumn).

## 7. Obsługa błędów
- **Błędy walidacji (400)**: Jeśli parametry zapytania nie przejdą walidacji Zod, handler zwróci odpowiedź z kodem 400 i szczegółami błędu.
- **Brak uwierzytelnienia (401)**: Middleware zwróci 401, jeśli użytkownik nie jest zalogowany.
- **Błędy serwera (500)**: Wszelkie nieoczekiwane błędy (np. błąd połączenia z bazą danych) będą przechwytywane w bloku `try...catch`, logowane do konsoli, a następnie handler zwróci odpowiedź z kodem 500.

## 8. Rozważania dotyczące wydajności
- **Paginacja**: Implementacja paginacji po stronie serwera jest kluczowa dla wydajności, aby uniknąć pobierania dużej liczby rekordów naraz.
- **Indeksowanie bazy danych**: Należy upewnić się, że kolumna `user_id` w tabeli `prds` jest zindeksowana, aby przyspieszyć zapytania filtrujące. Kolumny używane do sortowania (`name`, `status`, `createdAt`, `updatedAt`) również powinny być zindeksowane.
- **Selekcja kolumn**: Zapytanie do bazy danych powinno wybierać tylko te kolumny, które są niezbędne do zbudowania odpowiedzi (`id`, `name`, `status`, `createdAt`, `updatedAt`), aby zminimalizować transfer danych.

## 9. Etapy wdrożenia
1. **Walidacja**: Zdefiniować schemę Zod w `src/lib/validation/prds.ts` do walidacji parametrów zapytania `page`, `limit`, `sortBy` i `order`.
2. **Serwis**: Zaimplementować funkcję `getPrds` w `src/lib/services/prds.ts`, która:
   - Przyjmuje `userId` oraz opcje paginacji i sortowania.
   - Wykonuje zapytanie do Supabase, aby pobrać liczbę PRD oraz ich listę dla danego użytkownika.
   - Zwraca obiekt `PaginatedPrdsDto`.
3. **Endpoint**: Zaktualizować handler `GET` w `src/pages/api/prds/index.ts`, aby:
   - Pobierał `userId` z sesji (po weryfikacji przez middleware).
   - Walidował parametry zapytania przy użyciu zdefiniowanej schemy Zod.
   - Wywoływał serwis `prds.ts` w celu pobrania danych.
   - Zwracał odpowiedź w formacie JSON z odpowiednim kodem statusu.
