# Specyfikacja Techniczna: Moduł Uwierzytelniania Użytkowników

## 1. Wprowadzenie

Niniejszy dokument opisuje architekturę i implementację modułu uwierzytelniania, autoryzacji i zarządzania kontem użytkownika w aplikacji PRDify. Rozwiązanie bazuje na wymaganiach zdefiniowanych w `US-001` i `US-002` dokumentu PRD oraz na stosie technologicznym określonym w `tech-stack.md`. Celem jest stworzenie bezpiecznego i wydajnego systemu logowania, rejestracji, wylogowywania i odzyskiwania hasła z wykorzystaniem Supabase Auth oraz Astro.

## 2. Architektura Interfejsu Użytkownika (Frontend)

Architektura frontendu zostanie oparta o Astro dla renderowania stron (SSR) oraz React dla komponentów interaktywnych, takich jak formularze. Użyjemy biblioteki `shadcn/ui` do budowy spójnego interfejsu.

### 2.1. Layouty

Stworzymy jeden główny layout, który będzie dynamicznie dostosowywał interfejs w zależności od stanu uwierzytelnienia użytkownika.

-   **`src/layouts/BaseLayout.astro`**:
    -   Główny layout aplikacji.
    -   Będzie pobierał informacje o sesji użytkownika z `Astro.locals`, które zostaną dostarczone przez middleware.
    -   Będzie zawierał komponent `<Header />` oraz slot `<slot />` na treść poszczególnych stron.
    -   Zarządza globalnymi stylami (Tailwind) i metadanymi.

### 2.2. Strony (Astro Pages)

Strony będą odpowiedzialne za strukturę i renderowanie komponentów React.

-   **`src/pages/auth/login.astro`**:
    -   Publicznie dostępna strona logowania.
    -   Będzie renderować komponent `<LoginForm client:load />`.
    -   W przypadku, gdy zalogowany użytkownik spróbuje uzyskać do niej dostęp, zostanie przekierowany na stronę główną (`/dashboard`).
-   **`src/pages/auth/register.astro`**:
    -   Publicznie dostępna strona rejestracji.
    -   Będzie renderować komponent `<RegisterForm client:load />`.
    -   Podobnie jak `/auth/login`, będzie przekierowywać zalogowanych użytkowników.
-   **`src/pages/dashboard.astro`**:
    -   Strona chroniona, dostępna tylko dla zalogowanych użytkowników. Będzie to główny panel z listą PRD.
    -   Logika ochrony trasy będzie zaimplementowana w middleware.
-   **`src/pages/auth/callback.astro`**:
    -   Endpoint do obsługi callbacków z Supabase, np. po potwierdzeniu rejestracji przez e-mail. Endpoint ten odbierze kod autoryzacyjny z parametrów URL, a następnie użyje serwerowego klienta Supabase do wywołania metody `exchangeCodeForSession(code)`, która zakończy proces uwierzytelniania i ustawi sesję. Po pomyślnej wymianie, użytkownik zostanie przekierowany do `/dashboard`.
-   **`src/pages/auth/password-recovery.astro`**:
    -   Publicznie dostępna strona do inicjowania procesu odzyskiwania hasła.
    -   Będzie renderować komponent `<PasswordRecoveryForm client:load />`.
-   **`src/pages/auth/update-password.astro`**:
    -   Strona, na którą użytkownik jest przekierowywany z linku w e-mailu do odzyskiwania hasła.
    -   Będzie renderować komponent `<UpdatePasswordForm client:load />`.

### 2.3. Komponenty (React & Astro)

-   **`src/components/Header.astro`**:
    -   Komponent renderowany w `BaseLayout.astro`.
    -   Otrzyma stan zalogowania jako `prop`.
    -   Dla gości: wyświetli linki "Zaloguj się" i "Zarejestruj się".
    -   Dla zalogowanych użytkowników: wyświetli nazwę użytkownika (email) oraz przycisk "Wyloguj się", który będzie formularzem POST wysyłającym żądanie do endpointu `/api/auth/logout`.
-   **`src/components/LoginForm.tsx`**:
    -   Komponent React (`client:load`).
    -   Zawiera formularz z polami na e-mail i hasło.
    -   Wykorzysta `react-hook-form` do zarządzania stanem formularza i `zod` do walidacji po stronie klienta.
    -   Po submisji wysyła żądanie `POST` do `/api/auth/login`.
    -   Obsługuje i wyświetla komunikaty o błędach zwrócone z API (np. "Nieprawidłowe dane logowania").
    -   Po pomyślnym zalogowaniu, przekierowuje użytkownika na `/dashboard`.
    -   Zawiera linki do `/auth/register` i `/auth/password-recovery`.
-   **`src/components/RegisterForm.tsx`**:
    -   Komponent React (`client:load`).
    -   Formularz z polami na e-mail i hasło.
    -   Walidacja po stronie klienta (`zod` + `react-hook-form`).
    -   Wysyła żądanie `POST` do `/api/auth/register`.
    -   Po pomyślnej rejestracji, użytkownik jest automatycznie logowany i przekierowywany na `/dashboard`.
-   **Pozostałe formularze React (`PasswordRecoveryForm.tsx`, `UpdatePasswordForm.tsx`)**:
    -   Stworzone analogicznie do powyższych, będą obsługiwać swoje specyficzne przypadki użycia i komunikować się z dedykowanymi endpointami API.

### 2.4. Walidacja i Obsługa Błędów

-   **Walidacja po stronie klienta**: Natychmiastowa informacja zwrotna dla użytkownika dzięki `react-hook-form` i `zod` (np. "Nieprawidłowy format e-mail", "Hasło musi mieć co najmniej 6 znaków").
-   **Komunikaty z serwera**: Formularze będą przygotowane na odbieranie i wyświetlanie błędów z API (np. "Użytkownik o tym adresie e-mail już istnieje", "Nieprawidłowe hasło").

## 3. Logika Backendowa

Backend będzie oparty o Astro w trybie SSR, co pozwoli na integrację z Supabase po stronie serwera i zabezpieczenie stron.

### 3.1. Astro Middleware

-   **`src/middleware/index.ts`**:
    -   Centralny punkt logiki autoryzacyjnej.
    -   Będzie uruchamiany przy każdym żądaniu do serwera.
    -   Wykorzysta pakiet `@supabase/ssr` do utworzenia serwerowego klienta Supabase na podstawie ciasteczek z żądania.
    -   Sprawdzi, czy użytkownik ma aktywną sesję.
    -   Udostępni dane sesji i użytkownika w `Astro.locals`, dzięki czemu będą dostępne wewnątrz komponentów Astro i endpointów API (`Astro.locals.session`, `Astro.locals.user`).
    -   Zabezpieczy trasy: Middleware zaimplementuje logikę "domyślnie prywatne". Każda trasa, która nie znajduje się na jawnej liście publicznej (np. `/auth/login`, `/auth/register`, `/auth/password-recovery`, `/auth/update-password`, `/auth/callback`, `/api/auth/*`), będzie wymagała aktywnej sesji użytkownika. Próba dostępu do chronionej trasy bez sesji spowoduje przekierowanie na `/auth/login`.
    -   Jeśli zalogowany użytkownik spróbuje wejść na stronę przeznaczoną tylko dla gości (`/auth/login`, `/auth/register`), zostanie przekierowany na `/dashboard`.

### 3.2. API Endpoints

Punkty końcowe API będą zdefiniowane jako pliki w `src/pages/api/`.

-   **`POST /api/auth/login`**:
    -   Odbiera `email` i `password` w ciele żądania.
    -   Waliduje dane wejściowe za pomocą `zod`.
    -   Używa serwerowego klienta Supabase do wywołania `signInWithPassword`.
    -   W przypadku sukcesu, `@supabase/ssr` automatycznie zarządza ustawieniem ciasteczek sesji w odpowiedzi. Endpoint zwraca status 200 OK.
    -   W przypadku błędu (np. złe hasło), zwraca odpowiedni status HTTP (np. 401) i komunikat błędu w formacie JSON.
-   **`POST /api/auth/register`**:
    -   Odbiera `email` i `password`.
    -   Waliduje dane.
    -   Wywołuje `signUp` z Supabase. Domyślnie Supabase może wymagać potwierdzenia e-mail. Na potrzeby MVP możemy wyłączyć tę opcję w panelu Supabase dla uproszczenia przepływu.
    -   Po sukcesie, sesja jest tworzona, a ciasteczka ustawiane. Zwraca status 200 OK.
    -   Obsługuje błędy, np. gdy użytkownik już istnieje (status 409).
-   **`POST /api/auth/logout`**:
    -   Nie wymaga danych wejściowych.
    -   Wywołuje `signOut` na serwerowym kliencie Supabase.
    -   `@supabase/ssr` obsługuje usunięcie ciasteczek sesji.
    -   Endpoint bezpośrednio przekierowuje użytkownika na stronę `/auth/login` (np. zwracając status 303 See Other).
-   **`POST /api/auth/password-recovery`**:
    -   Odbiera `email`.
    -   Wywołuje `resetPasswordForEmail` w Supabase, co spowoduje wysłanie e-maila z linkiem do resetu hasła.
-   **`POST /api/auth/update-password`**:
    -   Odbiera nowe hasło i token sesji.
    -   Wywołuje `updateUser` w Supabase, aby zaktualizować hasło użytkownika.

### 3.3. Modele Danych i Walidacja

-   Do walidacji danych wejściowych w endpointach API użyjemy biblioteki `zod`. Stworzymy schematy dla każdego DTO (Data Transfer Object), np.:
    ```typescript
    // src/lib/validators/auth.ts
    import { z } from 'zod';

    export const LoginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
    });

    export const RegisterSchema = LoginSchema;
    ```

## 4. System Autentykacji (Supabase Auth)

### 4.1. Integracja z Supabase

-   **Konfiguracja**: Projekt będzie wymagał ustawienia zmiennych środowiskowych `SUPABASE_URL` i `SUPABASE_ANON_KEY` w pliku `.env`.
-   **Klient Supabase**:
    -   Stworzymy plik `src/db/supabase.client.ts`, w którym zdefiniujemy funkcję do tworzenia serwerowego klienta Supabase z wykorzystaniem `@supabase/ssr`. To zapewni spójne zarządzanie sesją po stronie serwera. Formularze po stronie klienta będą komunikować się z API, więc dedykowany klient kliencki nie jest wymagany do samego procesu logowania/rejestracji.
-   **Tabela `users`**: Supabase Auth automatycznie zarządza tabelą `auth.users`. Nie musimy tworzyć jej ręcznie. Wszelkie dodatkowe dane profilowe użytkownika moglibyśmy przechowywać w publicznej tabeli `profiles` z relacją one-to-one do `auth.users`.
-   **Zarządzanie sesją**: Sesja będzie oparta o tokeny JWT przechowywane w bezpiecznych, `HttpOnly` ciasteczkach, co jest domyślnym i zalecanym zachowaniem `@supabase/ssr`. Middleware w Astro będzie odświeżać tokeny przy każdym żądaniu, zapewniając ciągłość sesji.

### 4.2. Kluczowe Scenariusze (Flow)

1.  **Rejestracja**: `RegisterForm` -> `POST /api/auth/register` -> `supabase.auth.signUp()` -> Ustawienie ciasteczek -> Przekierowanie na `/dashboard`.
2.  **Logowanie**: `LoginForm` -> `POST /api/auth/login` -> `supabase.auth.signInWithPassword()` -> Ustawienie ciasteczek -> Przekierowanie na `/dashboard`.
3.  **Dostęp do strony chronionej**: Żądanie `GET /dashboard` -> Middleware odczytuje ciasteczka -> Middleware weryfikuje sesję z Supabase -> Dostęp do strony zostaje udzielony -> Strona jest renderowana po stronie serwera z danymi użytkownika.
4.  **Wylogowanie**: Przycisk "Wyloguj się" w `Header.astro` -> `POST /api/auth/logout` -> `supabase.auth.signOut()` -> Usunięcie ciasteczek -> Przekierowanie na `/auth/login`.
