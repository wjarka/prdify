# Plan implementacji widoku DashboardView

## 1. Przegląd
Widok `DashboardView` jest głównym panelem dla zalogowanego użytkownika. Jego celem jest umożliwienie zarządzania wszystkimi dokumentami wymagań produktowych (PRD). Użytkownik może tutaj przeglądać listę swoich PRD, tworzyć nowe, wznawiać pracę nad istniejącymi oraz je usuwać. Widok ten stanowi centralny punkt nawigacyjny aplikacji.

## 2. Routing widoku
Widok będzie dostępny pod główną ścieżką aplikacji dla zalogowanych użytkowników: `/`.

## 3. Struktura komponentów
Komponenty zostaną zaimplementowane w React i wyrenderowane na stronie Astro (`src/pages/index.astro`) z dyrektywą `client:load`.

```
/src/pages/index.astro
└── /src/components/views/DashboardView.tsx (React, client:load)
    ├── /src/components/dashboard/DashboardHeader.tsx
    │   └── /src/components/dashboard/CreatePrdDialog.tsx
    │       └── /src/components/dashboard/CreatePrdForm.tsx
    ├── /src/components/dashboard/PrdList.tsx
    │   ├── /src/components/ui/Skeleton.tsx (dla stanu ładowania)
    │   ├── /src/components/dashboard/EmptyState.tsx (dla braku danych)
    │   └── /src/components/dashboard/PrdCard.tsx[]
    │       ├── /src/components/ui/Badge.tsx (PrdStatusBadge)
    │       └── /src/components/dashboard/PrdActionsMenu.tsx
    │           └── /src/components/dashboard/DeleteConfirmationDialog.tsx
    └── /src/components/dashboard/PrdPagination.tsx
```

## 4. Szczegóły komponentów

### `DashboardView`
- **Opis komponentu**: Główny kontener widoku. Zarządza stanem, w tym danymi PRD, paginacją, stanami ładowania i błędów. Odpowiada za orkiestrację wywołań API i przekazywanie danych do komponentów podrzędnych.
- **Główne elementy**: `DashboardHeader`, `PrdList`, `PrdPagination`.
- **Obsługiwane interakcje**: Inicjalizacja pobierania danych, obsługa zdarzeń od komponentów podrzędnych (zmiana strony, usunięcie PRD).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `DashboardViewModel`.
- **Propsy**: Brak.

### `PrdList`
- **Opis komponentu**: Renderuje listę PRD. Wyświetla szkielety (`Skeleton`) podczas ładowania, komunikat o braku danych (`EmptyState`), lub listę komponentów `PrdCard`.
- **Główne elementy**: `PrdCard[]`, `Skeleton[]`, `EmptyState`.
- **Obsługiwane interakcje**: Przekazuje zdarzenia `onDelete` i `onResume` z `PrdCard` do `DashboardView`.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `PrdListItemDto[]`, `boolean` (isLoading).
- **Propsy**: `prds: PrdListItemDto[]`, `isLoading: boolean`.

### `PrdCard`
- **Opis komponentu**: Reprezentuje pojedynczy PRD na liście. Wyświetla jego nazwę i status. Kliknięcie karty przenosi do edycji, a menu akcji pozwala na usunięcie. Zbudowany na bazie komponentu `Card` z Shadcn/ui.
- **Główne elementy**: `<a>` (opakowuje kartę dla nawigacji), `h3` (nazwa), `PrdStatusBadge`, `PrdActionsMenu`.
- **Obsługiwane interakcje**: `onClick` (nawigacja), `onDelete` (inicjuje proces usuwania).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `PrdListItemDto`.
- **Propsy**: `prd: PrdListItemDto`, `onDelete: (prdId: string, prdName: string) => void`.

### `CreatePrdDialog`
- **Opis komponentu**: Modal zawierający formularz do tworzenia nowego PRD. Zbudowany na bazie `Dialog` z Shadcn/ui.
- **Główne elementy**: `DialogTrigger` (przycisk "Utwórz nowy PRD"), `DialogContent` z `CreatePrdForm`.
- **Obsługiwane interakcje**: Otwieranie/zamykanie modala, obsługa `onSubmit` z formularza.
- **Obsługiwana walidacja**: Przekazuje stan walidacji z formularza.
- **Typy**: `CreatePrdCommand`.
- **Propsy**: `onSubmit: (command: CreatePrdCommand) => Promise<void>`.

### `CreatePrdForm`
- **Opis komponentu**: Formularz z polami do zdefiniowania nowego PRD.
- **Główne elementy**: `Input` i `Textarea` dla każdego pola `CreatePrdCommand`, `Button` do wysłania.
- **Obsługiwane interakcje**: Wprowadzanie danych, walidacja `onChange`/`onBlur`, `onSubmit`.
- **Obsługiwana walidacja**:
    - `name`: Wymagane, minimum 3 znaki.
    - `mainProblem`, `inScope`, `outOfScope`, `successCriteria`: Wymagane, minimum 10 znaków.
- **Typy**: `CreatePrdCommand`.
- **Propsy**: `onSubmit: (command: CreatePrdCommand) => Promise<void>`, `isSubmitting: boolean`.

## 5. Typy
Oprócz istniejących DTO (`PrdListItemDto`, `PaginatedPrdsDto`, `CreatePrdCommand`, `Pagination`, `PrdStatus`) z `src/types.ts`, wprowadzimy następujące typy ViewModel.

- **`DashboardViewModel`**: Główny obiekt stanu dla `DashboardView`.
  ```typescript
  interface DashboardViewModel {
    prds: PrdListItemDto[];
    pagination: Pagination | null;
    isLoading: boolean;
    error: string | null;
    queryParams: {
      page: number;
      limit: number;
      sortBy: 'name' | 'status' | 'createdAt' | 'updatedAt';
      order: 'asc' | 'desc';
    };
    isDeleteDialogOpen: boolean;
    prdToDelete: { id: string; name: string } | null;
  }
  ```

- **`PrdStatusViewModel`**: Mapa do tłumaczenia statusu PRD na czytelny tekst i wariant komponentu `Badge`.
  ```typescript
  interface PrdStatusViewModel {
    text: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
  
  const statusMap: Record<PrdStatus, PrdStatusViewModel> = {
    'planning': { text: 'Planowanie', variant: 'default' },
    'planning_review': { text: 'Podsumowanie', variant: 'secondary' },
    'prd_review': { text: 'Przeglądanie PRD', variant: 'outline' },
    'completed': { text: 'Ukończony', variant: 'default' },
  };
  ```

## 6. Zarządzanie stanem
Stan będzie zarządzany lokalnie w komponencie `DashboardView` przy użyciu hooków `useState` i `useEffect`. Logika interakcji z API zostanie wyizolowana w customowym hooku `usePrds` w celu poprawy czytelności i reużywalności.

- **`usePrds` hook**: Będzie odpowiedzialny za:
  - Pobieranie listy PRD (`GET /api/prds`).
  - Tworzenie nowego PRD (`POST /api/prds`).
  - Usuwanie PRD (`DELETE /api/prds/{id}`).
  - Zarządzanie stanem `isLoading`, `error`, `data` (w tym `prds` i `pagination`).
  - Udostępnianie funkcji do modyfikacji stanu (np. `setPage`, `createPrd`, `deletePrd`).

## 7. Integracja API
Komponenty będą komunikować się z API za pośrednictwem hooka `usePrds`.

- **`GET /api/prds`**:
  - **Cel**: Pobranie paginowanej listy PRD.
  - **Parametry**: `page`, `limit`, `sortBy`, `order`.
  - **Typ odpowiedzi**: `PaginatedPrdsDto`.
  - **Wywołanie**: Przy montowaniu komponentu i przy zmianie parametrów paginacji.

- **`POST /api/prds`**:
  - **Cel**: Utworzenie nowego PRD.
  - **Typ żądania (body)**: `CreatePrdCommand`.
  - **Typ odpowiedzi**: `PrdDto`.
  - **Wywołanie**: Po pomyślnym przesłaniu formularza `CreatePrdForm`.

- **`DELETE /api/prds/{id}`**:
  - **Cel**: Usunięcie istniejącego PRD.
  - **Parametry**: `id` w ścieżce URL.
  - **Typ odpowiedzi**: `204 No Content`.
  - **Wywołanie**: Po potwierdzeniu usunięcia w `DeleteConfirmationDialog`.

## 8. Interakcje użytkownika
- **Przeglądanie listy**: Użytkownik widzi listę PRD po załadowaniu widoku. Może nawigować między stronami za pomocą komponentu `PrdPagination`.
- **Wznawianie pracy**: Kliknięcie na dowolny obszar `PrdCard` przekierowuje użytkownika do widoku edycji PRD pod adresem `/prds/[id]`. 
- **Tworzenie PRD**: Kliknięcie przycisku "Utwórz nowy PRD" otwiera modal. Wypełnienie i wysłanie formularza tworzy nowy PRD i przekierowuje użytkownika do widoku edycji pod adresem `/prds/[nowe-id]`, który automatycznie wyświetli pierwszy etap (sesję planistyczną).
- **Usuwanie PRD**: Użytkownik klika ikonę menu na karcie, wybiera "Usuń", a następnie potwierdza swoją decyzję w modalu.

## 9. Warunki i walidacja
- **Formularz tworzenia PRD**:
  - Walidacja będzie przeprowadzana po stronie klienta przy użyciu biblioteki `react-hook-form` z `zod-resolver`, aby zapewnić spójność z walidacją backendową.
  - Przycisk "Utwórz" jest nieaktywny, dopóki wszystkie pola nie spełnią kryteriów walidacji.
  - Komunikaty o błędach są wyświetlane pod odpowiednimi polami formularza.

## 10. Obsługa błędów
- **Błąd pobierania listy**: Jeśli `GET /api/prds` zakończy się niepowodzeniem, w miejscu listy zostanie wyświetlony komunikat o błędzie z przyciskiem "Spróbuj ponownie".
- **Błąd tworzenia PRD**: Komunikat o błędzie z API (np. "Nazwa jest już zajęta") zostanie wyświetlony wewnątrz modala `CreatePrdDialog`, bez jego zamykania.
- **Błąd usuwania PRD**: Zostanie wyświetlony globalny komunikat typu "toast" informujący o niepowodzeniu operacji.
- **Stan pusty**: Jeśli API zwróci pustą listę PRD, zostanie wyświetlony komponent `EmptyState` z zachętą do utworzenia pierwszego dokumentu.

## 11. Kroki implementacji
1.  **Struktura plików**: Stworzenie pustych plików komponentów zgodnie z drzewem w sekcji 3.
2.  **Implementacja `usePrds` hook**: Zaimplementowanie logiki do pobierania, tworzenia i usuwania PRD, włączając zarządzanie stanem ładowania i błędów.
3.  **Budowa komponentów statycznych**: Zaimplementowanie `PrdCard`, `PrdList`, `PrdPagination` i innych, na razie z użyciem danych testowych (mock data).
4.  **Integracja `usePrds` z `DashboardView`**: Podłączenie hooka do głównego komponentu, przekazanie danych i funkcji do komponentów podrzędnych.
5.  **Implementacja stanu ładowania i pustego**: Dodanie obsługi `isLoading` (wyświetlanie `Skeleton`) oraz stanu pustego (`EmptyState`).
6.  **Implementacja tworzenia PRD**: Zbudowanie `CreatePrdForm` wraz z walidacją oraz `CreatePrdDialog` i podłączenie logiki tworzenia z `usePrds`.
7.  **Implementacja usuwania PRD**: Zbudowanie `PrdActionsMenu` i `DeleteConfirmationDialog`, podłączenie logiki usuwania.
8.  **Implementacja nawigacji**: Dodanie logiki przekierowania po kliknięciu `PrdCard` oraz po pomyślnym utworzeniu nowego PRD.
9.  **Stylowanie i testowanie**: Finalne dopracowanie stylów, testowanie interakcji i obsługa przypadków brzegowych.
