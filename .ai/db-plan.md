# Schemat Bazy Danych PostgreSQL - PRDify

## 1. Tabele

### users (auth.users)
Tabela wbudowana w Supabase Auth, przechowująca podstawowe dane uwierzytelniające. Tabela ta jest poza bezpośrednią kontrolą naszej aplikacji, ale stanowi podstawę dla relacji z innymi tabelami.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id      | UUID| PRIMARY KEY  | Unikalny identyfikator użytkownika z Supabase Auth |
| email   | TEXT| UNIQUE       | Adres e-mail użytkownika |
| encrypted_password | TEXT | NOT NULL | Zahaszowane hasło użytkownika |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data utworzenia konta |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data ostatniej aktualizacji konta |

---

### profiles
Tabela przechowująca dodatkowe dane profilowe użytkowników (relacja 1-do-1 z `auth.users`).

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | UUID | PRIMARY KEY, FOREIGN KEY → auth.users.id ON DELETE CASCADE | Identyfikator użytkownika |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data utworzenia profilu |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data ostatniej aktualizacji |

---

### prds
Tabela główna przechowująca dokumenty PRD użytkowników.

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator PRD |
| user_id | UUID | NOT NULL, FOREIGN KEY → auth.users.id ON DELETE CASCADE | Właściciel dokumentu |
| name | TEXT | NOT NULL | Nazwa PRD |
| main_problem | TEXT | NOT NULL | Główny problem do rozwiązania |
| in_scope | TEXT | NOT NULL | Co jest w zakresie |
| out_of_scope | TEXT | NOT NULL | Co jest poza zakresem |
| success_criteria | TEXT | NOT NULL | Kryteria sukcesu |
| status | prd_status | NOT NULL, DEFAULT 'planning' | Aktualny status dokumentu |
| summary | TEXT | NULL | Edytowalne podsumowanie sesji planistycznej |
| content | TEXT | NULL | Finalna treść dokumentu PRD |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data utworzenia PRD |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data ostatniej aktualizacji |

**Ograniczenia:**
- `UNIQUE(user_id, name)` - nazwa PRD musi być unikalna w obrębie dokumentów użytkownika

---

### prd_questions
Tabela przechowująca historię dialogu AI podczas sesji planistycznej (relacja wiele-do-1 z `prds`).

| Kolumna | Typ | Ograniczenia | Opis |
|---------|-----|--------------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unikalny identyfikator pytania |
| prd_id | UUID | NOT NULL, FOREIGN KEY → prds(id) ON DELETE CASCADE | Powiązany dokument PRD |
| round_number | INTEGER | NOT NULL | Numer rundy Q&A |
| question | TEXT | NOT NULL | Treść pytania od AI |
| answer | TEXT | NULL | Odpowiedź użytkownika (NULL jeśli oczekuje na odpowiedź) |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data utworzenia pytania |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Data ostatniej aktualizacji |

---

## 2. Typy Wyliczeniowe (ENUM)

### prd_status
Określa aktualny etap procesu tworzenia PRD.

**Wartości:**
- `planning` - Etap sesji planistycznej (Krok 1)
- `planning_review` - Etap przeglądania podsumowania (Krok 2)
- `prd_review` - Etap przeglądania PRD (Krok 3)
- `completed` - Proces zakończony

**Domyślna wartość:** `planning`

---

## 3. Relacje między Tabelami

### Diagram Relacji

```
auth.users (Supabase)
    ↓ 1:1
profiles

auth.users (Supabase)
    ↓ 1:n
prds
    ↓ 1:n
prd_questions
```

### Szczegółowy Opis Relacji

1. **auth.users → profiles** (1:1)
   - Każdy użytkownik ma jeden profil
   - `profiles.id` = `auth.users.id`
   - ON DELETE CASCADE

2. **auth.users → prds** (1:n)
   - Jeden użytkownik może mieć wiele dokumentów PRD
   - `prds.user_id` → `auth.users.id`
   - ON DELETE CASCADE

3. **prds → prd_questions** (1:n)
   - Jeden PRD może mieć wiele pytań/odpowiedzi
   - `prd_questions.prd_id` → `prds.id`
   - ON DELETE CASCADE

---

## 4. Indeksy

### Indeksy Automatyczne (PRIMARY KEY, UNIQUE)
- `profiles.id` (PK)
- `prds.id` (PK)
- `prds(user_id, name)` (UNIQUE constraint)
- `prd_questions.id` (PK)

### Dodatkowe Indeksy dla Wydajności

```sql
-- Indeks dla wyszukiwania PRD użytkownika
CREATE INDEX idx_prds_user_id ON prds(user_id);

-- Indeks dla wyszukiwania pytań po PRD
CREATE INDEX idx_prd_questions_prd_id ON prd_questions(prd_id);

-- Indeks dla sortowania pytań po rundach w ramach PRD
CREATE INDEX idx_prd_questions_prd_round ON prd_questions(prd_id, round_number);
```

---

## 5. Row-Level Security (RLS) Policies

### Zasady Ogólne
- RLS jest włączone dla wszystkich tabel
- Użytkownicy mają dostęp tylko do swoich własnych danych
- Weryfikacja dostępu odbywa się poprzez `auth.uid()`

### Policies dla Tabeli `profiles`

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Użytkownik może odczytać tylko swój profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Użytkownik może zaktualizować tylko swój profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Użytkownik może wstawić tylko swój profil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Policies dla Tabeli `prds`

```sql
-- Enable RLS
ALTER TABLE prds ENABLE ROW LEVEL SECURITY;

-- Użytkownik może przeglądać tylko swoje PRD
CREATE POLICY "Users can view own prds"
  ON prds FOR SELECT
  USING (auth.uid() = user_id);

-- Użytkownik może tworzyć PRD tylko dla siebie
CREATE POLICY "Users can create own prds"
  ON prds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Użytkownik może aktualizować tylko swoje PRD
CREATE POLICY "Users can update own prds"
  ON prds FOR UPDATE
  USING (auth.uid() = user_id);

-- Użytkownik może usuwać tylko swoje PRD
CREATE POLICY "Users can delete own prds"
  ON prds FOR DELETE
  USING (auth.uid() = user_id);
```

### Policies dla Tabeli `prd_questions`

```sql
-- Enable RLS
ALTER TABLE prd_questions ENABLE ROW LEVEL SECURITY;

-- Użytkownik może przeglądać pytania tylko swoich PRD
CREATE POLICY "Users can view questions of own prds"
  ON prd_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prds
      WHERE prds.id = prd_questions.prd_id
      AND prds.user_id = auth.uid()
    )
  );

-- Użytkownik może tworzyć pytania tylko w swoich PRD
CREATE POLICY "Users can create questions in own prds"
  ON prd_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prds
      WHERE prds.id = prd_questions.prd_id
      AND prds.user_id = auth.uid()
    )
  );

-- Użytkownik może aktualizować pytania tylko swoich PRD
CREATE POLICY "Users can update questions of own prds"
  ON prd_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prds
      WHERE prds.id = prd_questions.prd_id
      AND prds.user_id = auth.uid()
    )
  );

-- Użytkownik może usuwać pytania tylko swoich PRD
CREATE POLICY "Users can delete questions of own prds"
  ON prd_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prds
      WHERE prds.id = prd_questions.prd_id
      AND prds.user_id = auth.uid()
    )
  );
```

---

## 6. Triggery dla Automatycznej Aktualizacji `updated_at`

```sql
-- Funkcja aktualizująca kolumnę updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger dla tabeli profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla tabeli prds
CREATE TRIGGER update_prds_updated_at
    BEFORE UPDATE ON prds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla tabeli prd_questions
CREATE TRIGGER update_prd_questions_updated_at
    BEFORE UPDATE ON prd_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. Dodatkowe Uwagi i Decyzje Projektowe

### Architektura i Separacja Danych
1. **Model skoncentrowany na PRD**: W wersji MVP, główną i jedyną encją biznesową jest dokument PRD. Taka architektura upraszcza model danych i jest w pełni wystarczająca dla obecnego zakresu. Jeśli w przyszłości aplikacja będzie wspierać inne typy dokumentów, będzie można wprowadzić nadrzędną encję `projects`, która zgrupowałaby różne dokumenty (np. `prds`, `db_plans`).

2. **Struktura tabeli `prds`**: Tabela `prds` przechowuje wszystkie dane związane z cyklem życia dokumentu: od jego inicjalizacji (problem, zakres), przez podsumowanie sesji planistycznej (`summary`), aż po finalną treść (`content`). Kolumny `summary` i `content` są nullowalne, ponieważ wypełniane są w kolejnych krokach procesu, co odzwierciedla progresywny charakter pracy nad dokumentem.

3. **Tabela `profiles`**: Jest osobną encją z relacją 1-do-1 do `auth.users`, co pozwala oddzielić dane aplikacyjne od danych uwierzytelniających Supabase. Ułatwia to przyszłą rozbudowę profilu użytkownika.

### Bezpieczeństwo
4. **Row-Level Security (RLS)**: Wszystkie tabele mają włączone RLS z kompletnymi politykami zapewniającymi, że użytkownicy mają dostęp wyłącznie do swoich danych.

5. **Kaskadowe usuwanie**: Zastosowanie `ON DELETE CASCADE` zapewnia, że usunięcie PRD automatycznie usuwa wszystkie powiązane z nim pytania i odpowiedzi.

### Integralność Danych
6. **Typ ENUM dla statusu**: Status dokumentu jest zarządzany przez typ wyliczeniowy `prd_status`, co zapewnia spójność danych.

7. **Unikalna nazwa PRD**: Ograniczenie `UNIQUE(user_id, name)` w tabeli `prds` zapewnia, że każdy użytkownik nie może mieć dwóch dokumentów PRD o tej samej nazwie.

8. **Wartości NULL w odpowiedziach**: Kolumna `answer` w tabeli `prd_questions` dopuszcza wartość NULL, co pozwala na przechowywanie pytań, na które użytkownik jeszcze nie odpowiedział.

### Skalowalność i Wydajność
9. **UUID jako klucze główne**: Wykorzystanie UUID zapobiega problemom bezpieczeństwa związanym z sekwencyjnymi ID i ułatwia przyszłe skalowanie.

10. **Indeksy wydajnościowe**: Dodatkowe indeksy na kolumnach `user_id` i kluczach obcych przyspieszają najczęstsze zapytania.

11. **Automatyczna aktualizacja timestampów**: Triggery automatycznie aktualizują kolumnę `updated_at`, co zapewnia śledzenie zmian bez konieczności ręcznego zarządzania w kodzie aplikacji.

### Zgodność z Wymaganiami MVP
12. **Wsparcie dla trzystopniowego procesu**: Schemat w pełni wspiera przepływ pracy opisany w dokumencie wymagań, od inicjalizacji PRD po jego finalizację.

13. **Metryki sukcesu**: Schemat umożliwia łatwe śledzenie metryk:
    - "Proces rozpoczęty": utworzenie rekordu w tabeli `prds`.
    - "Proces ukończony": wypełnienie kolumny `content` w tabeli `prds` dla danego dokumentu.

