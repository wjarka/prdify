# Architektura UI dla PRDify

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla PRDify została zaprojektowana w celu zapewnienia płynnego, prowadzonego i zintegrowanego doświadczenia w tworzeniu Dokumentów Wymagań Produktu (PRD). Opiera się na trzech głównych widokach: panelu uwierzytelniania, dashboardzie do zarządzania dokumentami oraz dedykowanym obszarze roboczym dla procesu tworzenia PRD.

Kluczowe założenia architektury:
- **Prowadzony przepływ:** Użytkownik jest prowadzony krok po kroku przez proces tworzenia PRD, co minimalizuje ryzyko błędów i niepewności.
- **Jednolity obszar roboczy:** Wszystkie etapy tworzenia dokumentu (planowanie, podsumowanie, edycja PRD) odbywają się w ramach jednego, dynamicznego widoku, eliminując potrzebę przeładowywania strony i ręcznego kopiowania danych.
- **Reaktywność i natychmiastowa informacja zwrotna:** Interfejs dynamicznie reaguje na akcje użytkownika, zapewniając jasne komunikaty o stanie ładowania, błędach czy sukcesie operacji.
- **Komponentowa budowa:** Wykorzystanie biblioteki komponentów Shadcn/ui zapewnia spójność wizualną i przyspiesza rozwój.

## 2. Lista widoków

### Widok 1: Uwierzytelnianie
- **Nazwa widoku:** AuthenticationView
- **Ścieżka widoku:** `/auth`
- **Główny cel:** Umożliwienie nowym użytkownikom rejestracji, a powracającym — logowania.
- **Kluczowe informacje do wyświetlenia:**
    - Formularz logowania (e-mail, hasło).
    - Formularz rejestracji (e-mail, hasło).
    - Komunikaty o błędach walidacji lub nieudanym uwierzytelnieniu.
- **Kluczowe komponenty widoku:**
    - `Tabs`: Do przełączania między logowaniem a rejestracją.
    - `Card`: Do opakowania formularzy.
    - `Input`, `Label`, `Button`: Elementy składowe formularzy.
    - `Alert`: Do wyświetlania błędów.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Jasne rozróżnienie między logowaniem a rejestracją. Czytelne komunikaty o błędach (np. "Nieprawidłowe hasło").
    - **Dostępność:** Poprawne etykiety dla pól formularzy, obsługa nawigacji klawiaturą.
    - **Bezpieczeństwo:** Komunikacja z API Supabase odbywa się przez HTTPS. Aplikacja nie przechowuje danych uwierzytelniających.

### Widok 2: Dashboard
- **Nazwa widoku:** DashboardView
- **Ścieżka widoku:** `/` (dla zalogowanych użytkowników)
- **Główny cel:** Zarządzanie wszystkimi PRD użytkownika — przeglądanie listy, tworzenie nowych, wznawianie pracy i usuwanie.
- **Kluczowe informacje do wyświetlenia:**
    - Lista istniejących PRD z ich nazwą i aktualnym statusem.
    - Stan pusty z wezwaniem do akcji, jeśli użytkownik nie ma żadnych PRD.
    - Elementy paginacji, jeśli lista jest długa.
- **Kluczowe komponenty widoku:**
    - `Button`: Przycisk "Utwórz nowy PRD".
    - `Dialog`: Modal z formularzem inicjującym nowy PRD.
    - `Card`: Reprezentacja pojedynczego PRD na liście.
    - `Badge`: Do wizualnego oznaczenia statusu PRD (np. "Planowanie", "Ukończony").
    - `DropdownMenu`: Menu kontekstowe dla każdej karty z opcją "Usuń".
    - `Pagination`: Komponent do nawigacji między stronami listy.
    - `Skeleton`: Do sygnalizowania stanu ładowania listy.
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Szybki dostęp do kluczowych akcji. Usuwanie jest operacją destrukcyjną i wymaga potwierdzenia w modalu. Kliknięcie karty PRD jest główną akcją, przenoszącą do edycji.
    - **Dostępność:** Poprawna obsługa fokusu po otwarciu i zamknięciu modala. Elementy interaktywne są dostępne z klawiatury.
    - **Bezpieczeństwo:** Wszystkie operacje (pobieranie, usuwanie) są autoryzowane i ograniczone do danych zalogowanego użytkownika przez RLS w Supabase.

### Widok 3: Proces Tworzenia PRD
- **Nazwa widoku:** PRDWorkspaceView
- **Ścieżka widoku:** `/prd/[id]`
- **Główny cel:** Zapewnienie zintegrowanego środowiska do pracy nad pojedynczym PRD, prowadzącego użytkownika przez trzy etapy: planowanie, podsumowanie i tworzenie finalnego dokumentu.
- **Kluczowe informacje do wyświetlenia:**
    - Nazwa edytowanego PRD.
    - Nienawigowalny wskaźnik postępu pokazujący aktualny etap.
    - Dynamiczna treść zależna od etapu (formularz Q&A, pole do edycji podsumowania, pole do edycji dokumentu, ostateczna wersja PRD).
- **Kluczowe komponenty widoku:**
    - **Kontener `PRDWorkspace`**: Główny komponent React zarządzający stanem całego procesu i warunkowo renderujący komponenty poszczególnych kroków.
    - **Komponent `PlanningStep` (Krok 1):**
        - Wyświetla historię pytań i odpowiedzi.
        - Renderuje formularz dla nowej rundy pytań (`Input`/`Textarea`).
        - Przyciski "Kontynuuj planowanie" i "Wygeneruj podsumowanie".
    - **Komponent `SummaryStep` (Krok 2):**
        - `Textarea` do edycji podsumowania.
        - Przyciski "Wróć do planowania" i "Zatwierdź i generuj PRD".
    - **Komponent `DocumentStep` (Krok 3):**
        - `Textarea` do edycji finalnego dokumentu.
        - Przycisk "Zakończ".
    - **Komponent `CompleteStep` (Krok 4):**
        - Wyświetlona zatwierdzona treść PRD
        - Przycisk "Eksportuj"
    - `Alert`: Do obsługi błędów generowania AI z opcją "Ponów".
    - `Spinner`: Do sygnalizowania operacji w toku (np. generowanie treści).
- **UX, dostępność i względy bezpieczeństwa:**
    - **UX:** Płynne przejścia między krokami bez przeładowywania strony. Jasno zdefiniowane akcje na każdym etapie. Stan aplikacji jest automatycznie zapisywany, co pozwala na bezpieczne przerwanie i wznowienie pracy.
    - **Dostępność:** Zarządzanie fokusem przy dynamicznym pojawianiu się nowych pól formularza. Komunikaty o błędach są dostępne dla czytników ekranu.
    - **Bezpieczeństwo:** Wszystkie interakcje z API są autoryzowane. Operacje modyfikacji są możliwe tylko wtedy, gdy PRD jest w odpowiednim statusie, co jest walidowane na backendzie.

## 3. Mapa podróży użytkownika

1.  **Rejestracja/Logowanie:** Użytkownik trafia na `/auth`, gdzie zakłada konto lub loguje się. Po pomyślnym uwierzytelnieniu jest przekierowywany na `/`.
2.  **Tworzenie PRD:** Na dashboardzie (`/`) klika "Utwórz nowy PRD". W modalu wypełnia podstawowe informacje i zatwierdza, co tworzy nowy dokument i przenosi go do obszaru roboczego (`/prd/[id]`).
3.  **Krok 1: Sesja Planistyczna:** W widoku `/prd/[id]` system automatycznie generuje pierwszą rundę pytań. Użytkownik odpowiada na nie i klika "Kontynuuj planowanie", aby zapisać odpowiedzi i otrzymać kolejną rundę. Proces powtarza, aż uzna planowanie za zakończone.
4.  **Krok 2: Generowanie Podsumowania:** Użytkownik klika "Zakończ planowanie". Interfejs przełącza się na widok podsumowania, gdzie może edytować wygenerowany tekst.
    - **Ścieżka alternatywna:** Jeśli podsumowanie jest niewystarczające, klika "Wróć do planowania", co cofa go do Kroku 1 w celu przeprowadzenia dodatkowych rund Q&A.
5.  **Krok 3: Generowanie Dokumentu PRD:** Po zaakceptowaniu podsumowania, klika "Zatwierdź i generuj PRD". Interfejs przełącza się na widok finalnego dokumentu, który również podlega edycji.
6.  **Finalizacja:** Po ostatecznych poprawkach, użytkownik klika "Zakończ". Dokument zostaje oznaczony jako ukończony (przechodzi w tryb tylko do odczytu), a przeglądarka przekierowuje na widok tylko do odczytu
7. **Podgląd i Eksport:** Użytkownik widzi ostateczną wersję dokumentu. Po kliknięciu "Eksportuj" przeglądarka inicjuje pobieranie pliku `prd.md`.
8.  **Powrót i Zarządzanie:** Użytkownik w każdej chwili może wrócić na Dashboard (`/`), klikając w logo, aby zobaczyć zaktualizowaną listę swoich PRD. Z poziomu dashboardu może wznowić pracę nad dowolnym nieukończonym PRD lub usunąć zbędny dokument.

## 4. Układ i struktura nawigacji

- **Główny Layout:** Aplikacja posiada stały, globalny nagłówek widoczny we wszystkich widokach dla zalogowanego użytkownika.
- **Nagłówek:**
    - **Logo (lewa strona):** Pełni funkcję linku powrotnego do Dashboardu (`/`).
    - **Menu Użytkownika (prawa strona):** `DropdownMenu` zawierające link do ustawień (w przyszłości) oraz przycisk "Wyloguj", który przekierowuje użytkownika do widoku `/auth`.
- **Nawigacja wewnątrzprocesowa:** Nawigacja w obrębie widoku `/prd/[id]` jest liniowa i kontrolowana wyłącznie za pomocą przycisków akcji. Wskaźnik postępu jest tylko wizualną reprezentacją etapu i nie pozwala na swobodne przełączanie się między krokami, co zapewnia integralność procesu.

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów (głównie z Shadcn/ui), które stanowią fundament interfejsu:

- **`Button`:** Podstawowy komponent do wszystkich akcji inicjowanych przez użytkownika.
- **`Card`:** Używany do wizualnej separacji i grupowania treści, głównie na liście PRD w Dashboardzie.
- **`Dialog`:** Służy do wyświetlania treści w oknie modalnym, np. formularza tworzenia nowego PRD.
- **`Input` & `Textarea`:** Główne komponenty do wprowadzania danych przez użytkownika w formularzach i polach edycji.
- **`Alert`:** Używany do komunikowania ważnych stanów, zwłaszcza błędów, z możliwością dodania przycisku akcji (np. "Ponów").
- **`Toast`:** Służy do wyświetlania globalnych, mniej inwazyjnych powiadomień, np. o pomyślnym zapisaniu zmian.
- **`Skeleton`:** Używany jako "placeholder" podczas ładowania danych, poprawiając odczuwalną wydajność aplikacji.
- **`Badge`:** Mały, wizualny wskaźnik używany do oznaczania statusu PRD na liście.
