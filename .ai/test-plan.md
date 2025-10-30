# Plan Testów dla Aplikacji "PRDify"

### 1. Wprowadzenie i Cele Testowania

#### 1.1. Wprowadzenie
Niniejszy dokument przedstawia kompleksowy plan testów dla aplikacji "PRDify". PRDify to aplikacja internetowa zbudowana w oparciu o nowoczesny stos technologiczny (Astro, React, Supabase), której celem jest wspieranie użytkowników w procesie tworzenia Dokumentów Wymagań Produktowych (PRD) z pomocą sztucznej inteligencji (AI). Aplikacja prowadzi użytkownika przez wieloetapowy proces, od zdefiniowania problemu, przez interaktywną sesję pytań i odpowiedzi z AI, aż do wygenerowania, edycji i finalizacji kompletnego dokumentu PRD.

#### 1.2. Cele Testowania
Głównym celem procesu testowania jest zapewnienie najwyższej jakości, niezawodności i bezpieczeństwa aplikacji PRDify przed jej wdrożeniem. Cele szczegółowe obejmują:
*   **Weryfikacja Funkcjonalna:** Upewnienie się, że wszystkie funkcje aplikacji, od uwierzytelniania po generowanie dokumentów, działają zgodnie ze specyfikacją.
*   **Zapewnienie Niezawodności:** Identyfikacja i eliminacja błędów, które mogłyby zakłócić pracę użytkownika, ze szczególnym uwzględnieniem interakcji z zewnętrznymi serwisami (Supabase, OpenRouter.ai).
*   **Walidacja Bezpieczeństwa:** Sprawdzenie, czy mechanizmy uwierzytelniania i autoryzacji skutecznie chronią dane użytkowników i zapewniają ich izolację.
*   **Ocena Użyteczności (UX/UI):** Zapewnienie, że interfejs użytkownika jest intuicyjny, responsywny i spójny na różnych urządzeniach.
*   **Weryfikacja Integracji:** Potwierdzenie poprawnej komunikacji między frontendem, backendem (Astro API routes), bazą danych (Supabase) i usługą AI (OpenRouter).

### 2. Zakres Testów

#### 2.1. Funkcjonalności objęte testami:
*   **Moduł Uwierzytelniania i Autoryzacji:**
    *   Rejestracja nowego użytkownika (z potwierdzeniem e-mail i bez).
    *   Logowanie i wylogowywanie.
    *   Mechanizm odzyskiwania hasła.
    *   Aktualizacja hasła przez zalogowanego użytkownika.
    *   Ochrona tras – dostęp do chronionych stron tylko dla zalogowanych użytkowników.
    *   Izolacja danych – weryfikacja, czy użytkownik ma dostęp wyłącznie do własnych zasobów (PRD).
*   **Dashboard PRD:**
    *   Wyświetlanie listy dokumentów PRD.
    *   Tworzenie nowego dokumentu PRD.
    *   Usuwanie istniejącego dokumentu PRD.
    *   Paginacja listy dokumentów.
    *   Wyświetlanie pustego stanu, gdy użytkownik nie ma żadnych dokumentów.
*   **Przestrzeń Robocza PRD (PRD Workspace):**
    *   **Krok 1: Planowanie (Planning):**
        *   Automatyczne generowanie pierwszej rundy pytań.
        *   Zapisywanie odpowiedzi na pytania.
        *   Generowanie kolejnych rund pytań.
        *   Wyświetlanie historii pytań i odpowiedzi.
    *   **Krok 2: Podsumowanie (Summary):**
        *   Generowanie podsumowania na podstawie odpowiedzi.
        *   Możliwość edycji i zapisania podsumowania.
        *   Możliwość powrotu do kroku planowania.
    *   **Krok 3: Dokument (Document):**
        *   Generowanie finalnego dokumentu PRD na podstawie podsumowania.
        *   Możliwość edycji i zapisania dokumentu.
    *   **Krok 4: Ukończenie (Complete):**
        *   Finalizacja i zablokowanie dokumentu do edycji.
        *   Możliwość eksportu ukończonego dokumentu do formatu Markdown.
*   **API (Endpointy w `src/pages/api/`):**
    *   Kompleksowe testowanie wszystkich endpointów RESTful pod kątem poprawności działania, obsługi błędów, walidacji danych wejściowych i bezpieczeństwa.

#### 2.2. Funkcjonalności wyłączone z testów:
*   Infrastruktura usług firm trzecich (Supabase, OpenRouter.ai). Testowana będzie jedynie integracja z tymi usługami.
*   Testowanie wydajnościowe i obciążeniowe (przewidziane w przyszłych fazach projektu).
*   Szczegółowe testy kompatybilności ze starszymi wersjami przeglądarek.

### 3. Typy Testów do Przeprowadzenia

Strategia testowania opiera się na piramidzie testów, aby zapewnić kompleksowe pokrycie przy optymalnym nakładzie pracy.

*   **Testy Jednostkowe (Unit Tests):**
    *   **Cel:** Weryfikacja poprawności działania małych, izolowanych fragmentów kodu (funkcji, komponentów bez stanu, schematów walidacji).
    *   **Zakres:** Funkcje pomocnicze (`lib/utils.ts`), schematy walidacji Zod (`lib/validation/`), proste komponenty UI, logika w custom hookach (z zamockowanymi zależnościami).

*   **Testy Komponentów (Component Tests):**
    *   **Cel:** Testowanie interaktywnych komponentów React w izolacji, weryfikacja ich renderowania i reakcji na interakcje użytkownika.
    *   **Zakres:** Formularze (`LoginForm`, `CreatePrdForm`), komponenty dashboardu (`PrdCard`, `PrdList`), komponenty przestrzeni roboczej (`QuestionForm`, `SummaryStep`).

*   **Testy Integracyjne (Integration Tests):**
    *   **Cel:** Sprawdzenie współpracy pomiędzy różnymi modułami aplikacji.
    *   **Zakres:**
        *   Interakcja komponentów React z custom hookami (`DashboardView` z `usePrds`).
        *   Działanie warstwy serwisowej (`lib/services/`) z testową bazą danych Supabase.
        *   Komunikacja klienta API (`openrouter.service.ts`) z zamockowanym zewnętrznym API.

*   **Testy API (API Tests):**
    *   **Cel:** Weryfikacja logiki backendowej, walidacji i bezpieczeństwa poprzez bezpośrednie wywołania endpointów API.
    *   **Zakres:** Wszystkie endpointy w `src/pages/api/`, w tym testowanie ścieżek pozytywnych, negatywnych (np. błędne dane, brak autoryzacji) i przypadków brzegowych.

*   **Testy End-to-End (E2E):**
    *   **Cel:** Symulacja pełnych scenariuszy użytkownika w działającej aplikacji, od początku do końca.
    *   **Zakres:** Kluczowe przepływy, takie jak "Rejestracja -> Logowanie -> Stworzenie PRD -> Przejście przez wszystkie kroki -> Wylogowanie".

*   **Testy Bezpieczeństwa:**
    *   **Cel:** Identyfikacja potencjalnych luk w zabezpieczeniach.
    *   **Zakres:** Testowanie autoryzacji (próby dostępu do cudzych danych), walidacji danych wejściowych (zapobieganie XSS), bezpieczeństwa sesji.

*   **Testy Dostępności (Accessibility Tests):**
    *   **Cel:** Zapewnienie, że aplikacja jest użyteczna dla osób z niepełnosprawnościami.
    *   **Zakres:** Audyt z użyciem automatycznych narzędzi, weryfikacja kontrastu, nawigacji klawiaturą i atrybutów ARIA.

### 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

#### 4.1. Uwierzytelnianie
*   **TC-AUTH-01:** Użytkownik może pomyślnie zarejestrować się przy użyciu prawidłowego e-maila i hasła.
*   **TC-AUTH-02:** System uniemożliwia rejestrację na już istniejący adres e-mail.
*   **TC-AUTH-03:** Użytkownik może pomyślnie zalogować się przy użyciu poprawnych danych.
*   **TC-AUTH-04:** System uniemożliwia logowanie przy użyciu nieprawidłowego hasła lub e-maila.
*   **TC-AUTH-05:** Zalogowany użytkownik może się wylogować i zostaje przekierowany na stronę logowania.
*   **TC-AUTH-06:** Niezalogowany użytkownik, próbując uzyskać dostęp do strony `/`, jest przekierowywany na `/auth/login`.

#### 4.2. Zarządzanie PRD (Dashboard)
*   **TC-PRD-01:** Zalogowany użytkownik widzi na dashboardzie listę swoich dokumentów PRD.
*   **TC-PRD-02:** Użytkownik może otworzyć dialog tworzenia nowego PRD, wypełnić formularz i pomyślnie utworzyć dokument.
*   **TC-PRD-03:** System uniemożliwia utworzenie PRD z nieprawidłowymi danymi (np. pusta nazwa).
*   **TC-PRD-04:** Użytkownik może usunąć istniejący PRD po potwierdzeniu operacji w oknie dialogowym.
*   **TC-PRD-05:** Paginacja działa poprawnie, gdy liczba dokumentów PRD przekracza limit na stronie.

#### 4.3. Przepływ Pracy w PRD Workspace
*   **TC-WRK-01:** Po utworzeniu nowego PRD, użytkownik jest przekierowywany do widoku Workspace, gdzie automatycznie generowana jest pierwsza runda pytań.
*   **TC-WRK-02:** Użytkownik może odpowiedzieć na wszystkie pytania w rundzie i przesłać odpowiedzi. Przycisk jest aktywny tylko po wypełnieniu wszystkich pól.
*   **TC-WRK-03:** Po udzieleniu odpowiedzi, użytkownik może wygenerować kolejną rundę pytań lub przejść do generowania podsumowania.
*   **TC-WRK-04:** Użytkownik może wygenerować podsumowanie, edytować je i zapisać zmiany.
*   **TC-WRK-05:** Z widoku podsumowania użytkownik może wygenerować finalny dokument PRD.
*   **TC-WRK-06:** Użytkownik może edytować wygenerowany dokument PRD.
*   **TC-WRK-07:** Użytkownik może sfinalizować dokument, co powoduje jego zablokowanie.
*   **TC-WRK-08:** Użytkownik może pobrać ukończony dokument PRD jako plik `.md`.

### 5. Środowisko Testowe
*   **Środowisko deweloperskie (lokalne):** Używane przez deweloperów do uruchamiania testów jednostkowych i integracyjnych podczas pracy nad kodem.
*   **Środowisko testowe (Staging):** Osobna instancja aplikacji zintegrowana z dedykowaną bazą danych Supabase (kopią produkcyjnej struktury, ale z danymi testowymi). Na tym środowisku będą uruchamiane testy automatyczne E2E oraz przeprowadzane testy manualne.
*   **Przeglądarki:** Testy będą przeprowadzane na najnowszych wersjach przeglądarek: Google Chrome, Mozilla Firefox i Safari.

### 6. Narzędzia do Testowania
*   **Framework do testów jednostkowych i integracyjnych:** **Vitest** - ze względu na natywną integrację ze środowiskiem Vite, używanym przez Astro.
*   **Biblioteka do testowania komponentów:** **React Testing Library** - do testowania komponentów React w sposób, w jaki używają ich użytkownicy.
*   **Framework do testów E2E:** **Playwright** - zaawansowane narzędzie od Microsoftu, oferujące szybkie i niezawodne testy na wielu przeglądarkach, nagrywanie scenariuszy i generowanie testów.
*   **Narzędzie do testów API:** **Postman/Insomnia** (do testów eksploracyjnych) oraz **Vitest** z biblioteką `supertest` (do zautomatyzowanych testów API).
*   **Ciągła Integracja (CI/CD):** **GitHub Actions** - do automatycznego uruchamiania wszystkich typów testów po każdym pushu do repozytorium.
*   **Testy dostępności:** **Axe DevTools** - jako rozszerzenie do przeglądarki i w ramach testów E2E.

### 7. Harmonogram Testów
Proces testowania będzie prowadzony równolegle z procesem deweloperskim, zgodnie z metodyką Agile.
*   **Sprint 1-2:** Skonfigurowanie środowiska testowego i narzędzi. Implementacja testów jednostkowych i integracyjnych dla modułu uwierzytelniania i podstawowych operacji CRUD na PRD.
*   **Sprint 3-4:** Rozwój testów E2E dla kluczowych przepływów (rejestracja, logowanie, tworzenie PRD). Testy integracyjne dla warstwy serwisowej i mockowanie API AI.
*   **Sprint 5-6:** Pełne pokrycie testami E2E i integracyjnymi całego procesu w PRD Workspace. Testy bezpieczeństwa i walidacji API.
*   **Faza stabilizacji (przed wdrożeniem):** Pełna regresja (automatyczna i manualna), testy eksploracyjne, finalne testy dostępności.

### 8. Kryteria Akceptacji Testów

#### 8.1. Kryteria wejścia (rozpoczęcia testów):
*   Dostępna jest stabilna wersja aplikacji na środowisku testowym.
*   Wszystkie testy jednostkowe i integracyjne dla danej funkcjonalności przechodzą pomyślnie.
*   Dokumentacja techniczna dla testowanych modułów jest dostępna.

#### 8.2. Kryteria wyjścia (zakończenia testów):
*   100% zdefiniowanych scenariuszy testowych zostało wykonanych.
*   Współczynnik pomyślnie zakończonych testów wynosi co najmniej 95%.
*   Wszystkie błędy krytyczne i blokujące zostały naprawione i zweryfikowane.
*   Brak znanych błędów o wysokim priorytecie w kluczowych funkcjonalnościach.
*   Pokrycie kodu testami jednostkowymi i integracyjnymi na poziomie co najmniej 80%.

### 9. Role i Odpowiedzialności
*   **Inżynier QA (Tester):**
    *   Odpowiedzialny za tworzenie i utrzymanie niniejszego planu testów.
    *   Projektowanie, implementacja i utrzymanie automatycznych testów (integracyjnych, API, E2E).
    *   Wykonywanie testów manualnych i eksploracyjnych.
    *   Raportowanie i śledzenie błędów.
    *   Koordynacja procesu testowego i raportowanie postępów.
*   **Deweloperzy:**
    *   Odpowiedzialni za pisanie testów jednostkowych dla swojego kodu.
    *   Naprawianie błędów zgłoszonych przez zespół QA.
    *   Wsparcie w konfiguracji środowiska testowego i procesów CI/CD.
*   **Product Owner / Project Manager:**
    *   Dostarczanie wymagań i kryteriów akceptacji.
    *   Priorytetyzacja błędów.
    *   Ostateczna akceptacja produktu po zakończeniu testów.

### 10. Procedury Raportowania Błędów
Wszystkie zidentyfikowane błędy będą raportowane w systemie do śledzenia zadań (np. GitHub Issues, Jira). Każdy raport o błędzie musi zawierać następujące informacje:
*   **Tytuł:** Zwięzły i jednoznaczny opis problemu.
*   **Środowisko:** Gdzie wystąpił błąd (np. Staging, przeglądarka Chrome v.XX).
*   **Kroki do odtworzenia:** Szczegółowa, ponumerowana lista kroków prowadzących do wystąpienia błędu.
*   **Wynik oczekiwany:** Co powinno się wydarzyć.
*   **Wynik rzeczywisty:** Co faktycznie się wydarzyło.
*   **Priorytet/Waga:** (np. Krytyczny, Wysoki, Średni, Niski).
*   **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.

Błędy będą przypisywane do odpowiednich deweloperów, a po naprawie wrócą do testera w celu retestu i zamknięcia.