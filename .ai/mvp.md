# Aplikacja - PRDify (MVP)

## Główny problem

Tworzenie Product Requirement Document według metodologii 10xDevs wymaga przejścia przez wieloetapowy proces (sesja planistyczna → podsumowanie → generowanie PRD → weryfikacja stacku). Każdy krok wymaga wielokrotnego kopiowania treści, przełączania kontekstów i ręcznego zarządzania promptami z biblioteki 10xRules.ai, co spowalnia proces i wprowadza tarcie w przepływie pracy.

## Najmniejszy zestaw funkcjonalności

Prosty system kont użytkowników do przechowywania projektów
Krok 1: Sesja planistyczna - guided form do rozmowy z AI (pytania/odpowiedzi, kilka rund)
Krok 2: Podsumowanie sesji - automatyczne wywołanie AI do podsumowania decyzji
Krok 3: Generowanie PRD - automatyczne tworzenie pełnego dokumentu PRD
Krok 4: Weryfikacja stacku - analiza wybranego stacku przez AI
Możliwość edycji na każdym etapie przed przejściem dalej
Przeglądanie, edycja i usuwanie projektów
Export PRD i tech-stack do markdown (gotowe do zapisania w .ai/)

## Co NIE wchodzi w zakres MVP

Współpraca wielu użytkowników nad jednym projektem
Wersjonowanie i historia zmian PRD
Własne/custom prompty (używamy fixed prompts z 10xRules.ai)
Templates dla różnych typów projektów
Integracje z GitHub/Linear/Jira
Generowanie diagramów/wizualizacji
MCP/agent integrations
Import istniejących PRD

## Kryteria sukcesu

80% rozpoczętych procesów kończy się kompletnym PRD + tech-stack (przejście przez wszystkie 4 kroki)
