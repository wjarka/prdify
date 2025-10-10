# Dokument wymagań produktu (PRD) - PRDify

## 1. Przegląd produktu

PRDify to aplikacja internetowa zaprojektowana w celu usprawnienia procesu tworzenia dokumentów wymagań produktowych (PRD) zgodnie z metodologią 10xDevs. Aplikacja prowadzi użytkownika przez trzyetapowy, ustrukturyzowany proces: od sesji planistycznej z AI, przez automatyczne generowanie podsumowania aż do pełnego PRD. Celem produktu jest zminimalizowanie tarcia w przepływie pracy, eliminując potrzebę ręcznego kopiowania treści i zarządzania promptami, co pozwala na szybsze i bardziej spójne tworzenie dokumentacji. Grupą docelową są programiści i menedżerowie produktu, którzy chcą efektywnie przekształcić początkową koncepcję w gotowy do implementacji dokument.

## 2. Problem użytkownika

Obecny proces tworzenia PRD według metodologii 10xDevs jest pracochłonny i fragmentaryczny. Użytkownicy muszą ręcznie zarządzać wieloma krokami: prowadzić sesję planistyczną, następnie ją podsumowywać, generować właściwy dokument PRD. Każdy z tych etapów wymaga wielokrotnego kopiowania i wklejania treści między różnymi narzędziami oraz ręcznego wyszukiwania i stosowania odpowiednich promptów z biblioteki 10xRules.ai. Ten przepływ pracy jest nieefektywny, podatny na błędy, spowalnia cały proces i wprowadza niepotrzebne tarcie, odciągając uwagę od merytorycznego dopracowywania wymagań.

## 3. Wymagania funkcjonalne

- F-001: System uwierzytelniania użytkowników oparty na adresie e-mail i haśle (rejestracja i logowanie).
- F-002: Zarządzanie projektami: tworzenie, przeglądanie, wznawianie pracy i usuwanie projektów.
- F-003: Inicjalizacja projektu poprzez formularz definiujący: Główny problem, Zakres MVP, Poza zakresem MVP, Kryteria sukcesu.
- F-004: Krok 1: Prowadzona sesja planistyczna w formie dynamicznego formularza, gdzie AI zadaje pytania, a użytkownik udziela odpowiedzi w polach tekstowych. Proces jest wielorundowy.
- F-005: Krok 2: Automatyczne generowanie edytowalnego podsumowania sesji planistycznej na podstawie wszystkich rund pytań i odpowiedzi.
- F-006: Możliwość powrotu z etapu podsumowania do etapu planowania w celu przeprowadzenia dodatkowych rund Q&A.
- F-007: Krok 3: Automatyczne generowanie pełnego, edytowalnego dokumentu PRD na podstawie zatwierdzonego podsumowania.
- F-008: Możliwość edycji treści na każdym z etapów generowania (Podsumowanie, PRD).
- F-009: Eksport finalnego PRD do pliku Markdown (`prd.md`).
- F-010: Utrwalanie stanu aplikacji po każdej jawnej akcji użytkownika kończącej dany etap.
- F-011: Walidacja formularzy w celu uniemożliwienia przesyłania pustych odpowiedzi.
- F-012: Wyświetlanie komunikatu o błędzie i opcji ponowienia próby w przypadku niepowodzenia generowania treści przez AI.

## 4. Granice produktu

Następujące funkcje nie wchodzą w zakres wersji MVP:

- Współpraca wielu użytkowników nad jednym projektem.
- Wersjonowanie i historia zmian w dokumentach PRD.
- Możliwość dodawania własnych, niestandardowych promptów.
- Szablony dla różnych typów projektów.
- Integracje z zewnętrznymi narzędziami (np. GitHub, Linear, Jira).
- Automatyczne generowanie diagramów lub innych wizualizacji.
- Integracje z agentami AI (MCP).
- Import istniejących dokumentów PRD.

## 5. Historyjki użytkowników

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby uzyskać dostęp do jej funkcjonalności.
- Kryteria akceptacji:
  - Użytkownik może przejść do formularza rejestracji ze strony logowania.
  - Formularz wymaga podania adresu e-mail i hasła.
  - System waliduje format adresu e-mail.
  - Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowany do panelu głównego.

- ID: US-002
- Tytuł: Logowanie użytkownika
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się do aplikacji przy użyciu mojego adresu e-mail i hasła, aby uzyskać dostęp do moich projektów.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola na e-mail i hasło.
  - W przypadku podania błędnych danych, wyświetlany jest stosowny komunikat.
  - Po pomyślnym zalogowaniu użytkownik jest przekierowany do panelu z listą swoich projektów.

- ID: US-003
- Tytuł: Tworzenie nowego projektu
- Opis: Jako zalogowany użytkownik, chcę móc rozpocząć nowy projekt, wypełniając początkowy formularz z czterema kluczowymi polami (problem, zakres MVP, poza zakresem, kryteria sukcesu), aby zainicjować proces tworzenia PRD.
- Kryteria akceptacji:
  - Na pulpicie głównym znajduje się przycisk "Utwórz nowy projekt".
  - Formularz zawiera cztery wymagane pola tekstowe.
  - Przesłanie formularza jest niemożliwe, jeśli którekolwiek pole jest puste.
  - Po przesłaniu formularza, proces zostaje uznany za "rozpoczęty" na potrzeby metryk, a użytkownik jest przenoszony do Kroku 1 (Sesja planistyczna).

- ID: US-004
- Tytuł: Przeglądanie listy projektów
- Opis: Jako zalogowany użytkownik, chcę widzieć listę wszystkich moich projektów na pulpicie głównym, aby móc szybko wybrać, nad którym chcę pracować.
- Kryteria akceptacji:
  - Pulpit główny wyświetla listę projektów użytkownika.
  - Każdy element listy zawiera nazwę projektu i wskazanie ostatniego etapu, na którym zakończono pracę.

- ID: US-005
- Tytuł: Usuwanie projektu
- Opis: Jako użytkownik, chcę mieć możliwość usunięcia projektu, którego już nie potrzebuję, aby utrzymać porządek na liście projektów.
- Kryteria akceptacji:
  - Na liście projektów przy każdym z nich znajduje się opcja "Usuń".
  - Przed usunięciem system prosi o potwierdzenie operacji.
  - Po potwierdzeniu projekt jest trwale usuwany z bazy danych i znika z listy.

- ID: US-006
- Tytuł: Wznawianie pracy nad projektem
- Opis: Jako użytkownik, chcę móc wznowić pracę nad istniejącym projektem, klikając na niego na liście, aby kontynuować od ostatniego zapisanego etapu.
- Kryteria akceptacji:
  - Kliknięcie projektu na liście (lub przycisku "Wznów"/"Edytuj") przenosi użytkownika do ostatniego etapu, na którym pracował (np. edycja PRD).
  - Wszystkie wcześniej wygenerowane i zapisane dane dla tego projektu są wczytywane.

- ID: US-007
- Tytuł: Przeprowadzanie sesji planistycznej (Krok 1)
- Opis: Jako użytkownik, chcę przejść przez wielorundową sesję pytań i odpowiedzi z AI, aby szczegółowo zdefiniować wymagania mojego projektu.
- Kryteria akceptacji:
  - Po utworzeniu projektu system prezentuje pierwszą rundę pytań od AI w formie formularza.
  - Użytkownik wypełnia pola odpowiedzi i przesyła je.
  - Po każdej rundzie użytkownik ma do wyboru opcje: "Kontynuuj planowanie" (następna runda Q&A) lub "Wygeneruj podsumowanie".
  - Po 5 rundach system może wyświetlić sugestię przejścia do następnego etapu.

- ID: US-008
- Tytuł: Generowanie podsumowania sesji (Krok 2)
- Opis: Jako użytkownik, po zakończeniu sesji planistycznej chcę wygenerować podsumowanie, które zbierze wszystkie moje decyzje w jeden spójny tekst.
- Kryteria akceptacji:
  - Kliknięcie przycisku "Wygeneruj podsumowanie" wysyła całą historię Q&A do AI.
  - AI zwraca pojedynczy, spójny tekst podsumowujący, który jest wyświetlany w edytowalnym polu tekstowym.

- ID: US-009
- Tytuł: Edycja wygenerowanego podsumowania
- Opis: Jako użytkownik, chcę mieć możliwość ręcznej edycji tekstu podsumowania, aby poprawić ewentualne nieścisłości lub doprecyzować informacje przed wygenerowaniem PRD.
- Kryteria akceptacji:
  - Pole z podsumowaniem jest edytowalne.
  - Użytkownik może zapisać zmiany.
  - Po edycji użytkownik może przejść do generowania PRD, klikając "Zatwierdź i generuj PRD".

- ID: US-010
- Tytuł: Powrót do etapu planowania
- Opis: Jako użytkownik, będąc na ekranie podsumowania, chcę mieć możliwość powrotu do sesji planistycznej, jeśli uznam, że podsumowanie jest niekompletne lub błędne.
- Kryteria akceptacji:
  - Na ekranie podsumowania znajduje się przycisk "Wróć do planowania".
  - System informuje, że powrót może spowodować utratę zmian w bieżącym podsumowaniu.
  - Po potwierdzeniu użytkownik wraca do interfejsu sesji planistycznej (Krok 1), aby przeprowadzić kolejną rundę Q&A.

- ID: US-011
- Tytuł: Generowanie dokumentu PRD (Krok 3)
- Opis: Jako użytkownik, po zatwierdzeniu podsumowania, chcę automatycznie wygenerować pełny dokument PRD, aby mieć gotową strukturę do dalszej pracy.
- Kryteria akceptacji:
  - Kliknięcie "Zatwierdź i generuj PRD" na ekranie podsumowania wysyła finalną wersję podsumowania do AI.
  - AI generuje kompletny dokument PRD o predefiniowanej strukturze.
  - Wygenerowany PRD jest wyświetlany w edytowalnym polu tekstowym.
  - Po wygenerowaniu PRD powrót do Kroków 1 i 2 jest niemożliwy.

- ID: US-012
- Tytuł: Edycja wygenerowanego PRD
- Opis: Jako użytkownik, chcę mieć możliwość edycji wygenerowanego dokumentu PRD, aby dopracować jego treść i finalne szczegóły.
- Kryteria akceptacji:
  - Pole tekstowe z treścią PRD jest w pełni edytowalne.
  - Użytkownik może zapisać wprowadzone zmiany.

- ID: US-013
- Tytuł: Eksport finalnego dokumentu
- Opis: Jako użytkownik, po ukończeniu całego procesu, chcę móc wyeksportować gotowy dokument PRD do pliku Markdown.
- Kryteria akceptacji:
  - Przycisk "Zakończ i eksportuj" jest dostępny na ostatnim etapie.
  - Kliknięcie przycisku inicjuje pobranie pliku `prd.md`.
  - Treść pliku odpowiada finalnej, edytowanej wersji dokumentu w aplikacji.

- ID: US-014
- Tytuł: Obsługa błędów walidacji formularzy
- Opis: Jako użytkownik, próbując przesłać formularz z brakującymi danymi, chcę otrzymać jasny komunikat o tym, które pola są wymagane.
- Kryteria akceptacji:
  - Próba przesłania formularza (np. definicji projektu, odpowiedzi w sesji Q&A) z pustymi polami jest blokowana.
  - System wyświetla komunikat wskazujący na konieczność wypełnienia wymaganych pól.

- ID: US-015
- Tytuł: Obsługa błędów generowania przez AI
- Opis: Jako użytkownik, w przypadku gdy generowanie treści przez AI nie powiedzie się, chcę zobaczyć komunikat o błędzie i mieć możliwość ponowienia próby.
- Kryteria akceptacji:
  - W przypadku błędu API po stronie AI, użytkownikowi wyświetlany jest czytelny komunikat o niepowodzeniu.
  - Obok komunikatu znajduje się przycisk "Ponów", który pozwala na ponowne wywołanie tej samej operacji generowania.

## 6. Metryki sukcesu

Głównym wskaźnikiem sukcesu dla wersji MVP jest wydajność i płynność przepływu pracy, mierzona jako wskaźnik ukończenia procesu.

- Główny wskaźnik: 80% rozpoczętych procesów kończy się kompletnym PRD (przejście przez wszystkie 3 kroki).
- Sposób pomiaru:
  - "Proces rozpoczęty" jest liczony jako zdarzenie, w którym użytkownik pomyślnie prześle formularz definicji nowego projektu (wypełnione 4 pola).
  - "Proces ukończony" jest liczony jako zdarzenie, w którym użytkownik pomyślnie wygeneruje PRD w Kroku 3.
