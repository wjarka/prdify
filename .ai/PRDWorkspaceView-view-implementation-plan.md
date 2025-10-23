# Plan implementacji widoku PRDWorkspaceView

## 1. Przegląd
Widok `PRDWorkspaceView` stanowi zintegrowane środowisko pracy nad pojedynczym dokumentem wymagań produktowych (PRD). Jego głównym celem jest przeprowadzenie użytkownika przez trzyetapowy proces: sesję planistyczną z AI, generowanie i edycję podsumowania oraz tworzenie i finalizację pełnego dokumentu PRD. Widok dynamicznie dostosowuje interfejs do aktualnego statusu PRD, zapewniając płynne przejścia między krokami bez konieczności przeładowywania strony.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką, która zawiera identyfikator konkretnego PRD:
- **Ścieżka:** `/prd/[id]`
- **Plik:** `src/pages/prd/[id].astro`

## 3. Struktura komponentów
Hierarchia komponentów została zaprojektowana w celu odizolowania logiki poszczególnych kroków i scentralizowania zarządzania stanem.

```
src/pages/prd/[id].astro
└── src/components/prd/PRDWorkspace.tsx (client:load)
    ├── PRDHeader.tsx (wyświetla nazwę PRD i wskaźnik postępu)
    ├── ui/Spinner.tsx (wyświetlany warunkowo podczas operacji asynchronicznych)
    ├── ui/Alert.tsx (wyświetlany warunkowo w przypadku błędów API)
    └── Kontener kroku (renderuje warunkowo jeden z poniższych komponentów)
        ├── PlanningStep.tsx
        │   ├── QuestionHistory.tsx (wyświetla historię pytań i odpowiedzi)
        │   └── QuestionForm.tsx (formularz dla bieżącej rundy pytań)
        ├── SummaryStep.tsx
        ├── DocumentStep.tsx
        └── CompleteStep.tsx
```

## 4. Szczegóły komponentów

### `PRDWorkspace.tsx` (Komponent kontenera)
- **Opis:** Główny komponent zarządzający stanem całego widoku. Odpowiada za pobieranie danych PRD, określanie bieżącego kroku na podstawie statusu, obsługę wszystkich wywołań API oraz renderowanie odpowiednich komponentów podrzędnych.
- **Główne elementy:** Komponenty `PRDHeader`, `Spinner`, `Alert` oraz jeden z komponentów kroku (`PlanningStep`, `SummaryStep`, `DocumentStep`, `CompleteStep`).
- **Obsługiwane interakcje:** Deleguje obsługę zdarzeń do niestandardowego hooka `usePRDWorkspace`, reagując na akcje użytkownika z komponentów podrzędnych, takie jak generowanie podsumowania, zapisywanie zmian czy finalizowanie PRD.
- **Obsługiwana walidacja:** Brak bezpośredniej walidacji; zarządza stanem (np. `isSubmitting`), który jest przekazywany do komponentów podrzędnych w celu blokowania/odblokowywania interakcji.
- **Typy:** `PrdDto`, `PrdQuestionDto`, `ApiErrorViewModel`.
- **Propsy:** `prdId: string`.

### `PlanningStep.tsx`
- **Opis:** Komponent dla pierwszego etapu (status `planning`). Wyświetla pełną historię dialogu z AI oraz formularz z najnowszą rundą pytań do wypełnienia przez użytkownika.
- **Główne elementy:** Komponent `QuestionHistory` do wyświetlania poprzednich rund. Komponent `QuestionForm` zawierający pola `Textarea` dla każdej odpowiedzi w bieżącej rundzie oraz przyciski akcji.
- **Obsługiwane interakcje:**
    - Wypełnianie i przesyłanie odpowiedzi.
    - Kliknięcie "Kontynuuj planowanie" w celu wygenerowania kolejnej rundy pytań.
    - Kliknięcie "Wygeneruj podsumowanie" w celu przejścia do następnego etapu.
- **Obsługiwana walidacja:** Przycisk "Prześlij odpowiedzi" jest nieaktywny, dopóki wszystkie pola odpowiedzi w bieżącej rundzie nie zostaną wypełnione.
- **Typy:** `PlanningStepViewModel`.
- **Propsy:**
    - `viewModel: PlanningStepViewModel`
    - `isSubmitting: boolean`
    - `onSubmitAnswers: (answers: PrdQuestionAnswer[]) => void`
    - `onContinuePlanning: () => void`
    - `onGenerateSummary: () => void`

### `SummaryStep.tsx`
- **Opis:** Komponent dla etapu recenzji podsumowania (status `planning_review`). Zawiera pole tekstowe do edycji wygenerowanego przez AI podsumowania.
- **Główne elementy:** Pole `Textarea` z wartością podsumowania, przyciski akcji.
- **Obsługiwane interakcje:**
    - Edycja treści podsumowania.
    - Kliknięcie "Wróć do planowania" w celu odrzucenia podsumowania i powrotu do etapu pytań.
    - Kliknięcie "Zatwierdź i generuj PRD" w celu przejścia do następnego etapu.
- **Obsługiwana walidacja:** Przycisk "Zatwierdź i generuj PRD" jest nieaktywny, jeśli pole `Textarea` jest puste.
- **Typy:** `PrdDto`.
- **Propsy:**
    - `prd: PrdDto`
    - `isSubmitting: boolean`
    - `onUpdateSummary: (summary: string) => void`
    - `onGoBackToPlanning: () => void`
    - `onGenerateDocument: () => void`

### `DocumentStep.tsx`
- **Opis:** Komponent dla etapu recenzji finalnego dokumentu (status `prd_review`). Zawiera pole tekstowe do edycji wygenerowanego dokumentu PRD.
- **Główne elementy:** Pole `Textarea` z treścią dokumentu, przycisk "Zakończ".
- **Obsługiwane interakcje:**
    - Edycja treści dokumentu.
    - Kliknięcie "Zakończ" w celu sfinalizowania i zablokowania PRD.
- **Obsługiwana walidacja:** Przycisk "Zakończ" jest nieaktywny, jeśli pole `Textarea` jest puste.
- **Typy:** `PrdDto`.
- **Propsy:**
    - `prd: PrdDto`
    - `isSubmitting: boolean`
    - `onUpdateDocument: (content: string) => void`
    - `onComplete: () => void`

### `CompleteStep.tsx`
- **Opis:** Komponent dla zakończonego PRD (status `completed`). Wyświetla finalną treść dokumentu w trybie tylko do odczytu.
- **Główne elementy:** Sformatowany kontener z treścią PRD, przycisk "Eksportuj".
- **Obsługiwane interakcje:** Kliknięcie "Eksportuj" inicjuje pobieranie pliku `.md`.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `PrdDto`.
- **Propsy:**
    - `prd: PrdDto`
    - `onExport: () => void`

## 5. Typy
Oprócz istniejących DTO (`PrdDto`, `PrdQuestionDto`, `PrdQuestionAnswer`) zostaną wprowadzone następujące typy ViewModel, aby lepiej zarządzać stanem UI:

```typescript
// Reprezentuje aktualny stan widoku, mapowany ze statusu PRD, z dodatkowymi stanami UI
export type PrdStep = 'planning' | 'summary' | 'document' | 'complete' | 'loading' | 'error';

// Struktura obiektu błędu do wyświetlania w komponencie Alert
export interface ApiErrorViewModel {
  message: string;
  onRetry?: () => void; // Opcjonalny callback do ponowienia operacji
}

// Model widoku dla komponentu PlanningStep, dzielący pytania na historię i bieżącą rundę
export interface PlanningStepViewModel {
  history: PrdQuestionDto[];      // Wszystkie poprzednie, odpowiedziane rundy
  currentRound: PrdQuestionDto[]; // Pytania w bieżącej rundzie do wypełnienia
}
```

## 6. Zarządzanie stanem
Logika biznesowa, stan oraz interakcje z API zostaną scentralizowane w niestandardowym hooku `usePRDWorkspace(prdId: string)`, aby utrzymać komponent `PRDWorkspace` jako czysto prezentacyjny.

- **Stan zarządzany w hooku:**
    - `prd: PrdDto | null`: Główne dane dotyczące PRD.
    - `questions: PrdQuestionDto[] | null`: Pełna historia pytań i odpowiedzi.
    - `currentStep: PrdStep`: Aktualny krok UI, pochodna `prd.status`.
    - `isLoading: boolean`: Globalny stan ładowania (np. przy przejściach między krokami).
    - `isSubmitting: boolean`: Stan blokujący przyciski podczas konkretnej akcji API.
    - `error: ApiErrorViewModel | null`: Obiekt błędu do wyświetlenia.

- **Funkcje (akcje) eksponowane przez hooka:**
    - `submitAnswers`, `generateNextQuestions`, `generateSummary`, `updateSummary`, `revertToPlanning`, `generateDocument`, `updateDocument`, `completePrd`, `exportPrd`, `retryLastAction`.

## 7. Integracja API
Interfejs będzie komunikował się z backendem zgodnie z udokumentowanymi endpointami. Każda operacja modyfikująca stan PRD (`POST`, `PATCH`, `DELETE`) będzie skutkowała ponownym pobraniem głównych danych PRD (`GET /api/prds/{id}`), aby zapewnić synchronizację stanu.

- **Inicjalizacja widoku:**
    - `GET /api/prds/{id}`: Pobranie danych PRD i ustawienie `currentStep`.
    - Jeśli `prd.status === 'planning'`, pobranie pytań przez `GET /api/prds/{id}/questions`. Jeśli brak pytań, automatyczne wywołanie `POST /api/prds/{id}/questions/generate`.
- **Krok planowania:**
    - `PATCH /api/prds/{id}/questions`: Przesłanie odpowiedzi.
    - `POST /api/prds/{id}/questions/generate`: Wygenerowanie nowej rundy pytań.
- **Krok podsumowania:**
    - `POST /api/prds/{id}/summary`: Wygenerowanie podsumowania.
    - `PATCH /api/prds/{id}/summary`: Zapisanie zmian w podsumowaniu.
    - `DELETE /api/prds/{id}/summary`: Powrót do planowania.
- **Krok dokumentu:**
    - `POST /api/prds/{id}/document`: Wygenerowanie finalnego dokumentu.
    - `PATCH /api/prds/{id}/document`: Zapisanie zmian w dokumencie.
    - `POST /api/prds/{id}/complete`: Zakończenie pracy nad PRD.
- **Krok końcowy:**
    - `GET /api/prds/{id}.md`: Eksport dokumentu (realizowany przez przekierowanie przeglądarki).

## 8. Interakcje użytkownika
- **Ładowanie widoku:** Użytkownik widzi globalny `Spinner`, a następnie interfejs odpowiedniego kroku, zdeterminowany przez status PRD.
- **Odpowiadanie na pytania:** Użytkownik wypełnia formularz. Po kliknięciu "Prześlij odpowiedzi" przyciski są blokowane, a po sukcesie formularz jest gotowy na akcję "Kontynuuj planowanie".
- **Generowanie treści (podsumowanie/dokument):** Użytkownik klika przycisk generowania. Wyświetlany jest globalny `Spinner`. Po zakończeniu operacji widok przechodzi do kolejnego kroku z wygenerowaną treścią.
- **Edycja tekstu:** Zmiany w polach `Textarea` (podsumowanie, dokument) są zapisywane TYLKO za pomocą dedykowanego przycisku. Subtelny wskaźnik "Zapisano" informuje o sukcesie.
- **Błąd operacji:** Na górze widoku pojawia się komponent `Alert` z komunikatem o błędzie i przyciskiem "Ponów próbę", który wywołuje ostatnią nieudaną akcję.

## 9. Warunki i walidacja
Logika warunkowa w UI będzie sterowana głównie przez status PRD i stany pomocnicze (`isSubmitting`).
- **Warunki na podstawie statusu:** Przyciski akcji w każdym komponencie kroku będą nieaktywne (`disabled`), jeśli `prd.status` nie odpowiada danemu krokowi. Na przykład, przyciski w `SummaryStep` będą aktywne tylko, gdy `prd.status === 'planning_review'`.
- **Walidacja formularzy:**
    - **PlanningStep:** Przycisk przesyłania odpowiedzi jest nieaktywny, jeśli którekolwiek pole odpowiedzi jest puste.
    - **SummaryStep:** Przycisk generowania dokumentu jest nieaktywny, jeśli podsumowanie jest puste.
    - **DocumentStep:** Przycisk zakończenia jest nieaktywny, jeśli dokument jest pusty.

## 10. Obsługa błędów
- **Błąd ładowania PRD:** Jeśli początkowe zapytanie `GET /api/prds/{id}` zawiedzie, widok wyświetli błąd na pełnym ekranie z opcją ponowienia próby.
- **Błąd akcji API:** Każde wywołanie API w hooku `usePRDWorkspace` będzie opakowane w blok `try...catch`. W przypadku błędu:
    1. Stan `isSubmitting` jest ustawiany na `false`.
    2. Stan `error` jest wypełniany obiektem `ApiErrorViewModel`, zawierającym komunikat i funkcję `onRetry` wskazującą na akcję, która ma być ponowiona.
    3. Komponent `Alert` renderuje błąd i przycisk "Ponów próbę".
- **Konflikt stanu (409):** Jeśli API zwróci błąd konfliktu, użytkownikowi zostanie wyświetlony komunikat informujący, że dana akcja jest niedozwolona na tym etapie.

## 11. Kroki implementacji
1.  **Utworzenie struktury plików:** Stworzenie plików dla strony Astro (`/prd/[id].astro`) oraz wszystkich komponentów React (`PRDWorkspace.tsx`, `PlanningStep.tsx` itd.) i typów (`types/viewModels.ts`).
2.  **Implementacja hooka `usePRDWorkspace`:** Zdefiniowanie stanu, logiki pobierania początkowych danych (`GET /api/prds/{id}` i `GET /api/prds/{id}/questions`) oraz mapowania statusu PRD na `PrdStep`.
3.  **Implementacja komponentu `PRDWorkspace`:** Stworzenie głównego layoutu, który konsumuje hook `usePRDWorkspace` i warunkowo renderuje `Spinner`, `Alert` oraz odpowiedni komponent kroku.
4.  **Implementacja `PlanningStep`:** Zbudowanie interfejsu do wyświetlania historii i formularza odpowiedzi, podłączenie logiki walidacji i obsługi zdarzeń.
5.  **Implementacja `SummaryStep`:** Zbudowanie interfejsu z polem `Textarea` i przyciskami, podłączenie obsługi zdarzeń.
6.  **Implementacja `DocumentStep` i `CompleteStep`:** Analogiczne zbudowanie pozostałych komponentów kroków.
7.  **Scentralizowana obsługa API:** Implementacja wszystkich funkcji akcji (np. `generateSummary`, `updateDocument`) w hooku `usePRDWorkspace`, włączając w to obsługę błędów i aktualizację stanu.
8.  **Stylowanie i UX:** Dopracowanie stylów za pomocą Tailwind CSS, dodanie płynnych przejść i wskaźników stanu (np. "Zapisano").
