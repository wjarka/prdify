# Password Recovery Implementation

## Overview

Implementacja funkcjonalności odzyskiwania hasła została zrealizowana zgodnie z metodologią Supabase Auth i wzorcem stosowanym w innych endpointach autentykacji (login, register).

## Architektura Rozwiązania

### 1. Backend API Endpoints

#### `/api/auth/password-recovery` (POST)
Endpoint odpowiedzialny za inicjowanie procesu odzyskiwania hasła.

**Lokalizacja:** `src/pages/api/auth/password-recovery.ts`

**Funkcjonalność:**
- Walidacja adresu e-mail za pomocą `PasswordRecoverySchema` (Zod)
- Wywołanie `supabase.auth.resetPasswordForEmail()`
- Przekierowanie do `/auth/callback?next=/auth/update-password`
- Implementacja ochrony przed enumeracją adresów e-mail (zawsze zwraca sukces)
- Obsługa rate limiting i błędów systemowych

**Przepływ:**
```typescript
POST /api/auth/password-recovery
Body: { email: string }

↓ Walidacja (Zod)
↓ supabase.auth.resetPasswordForEmail()
↓ Supabase wysyła e-mail z linkiem

Response: { message: "Jeśli konto istnieje, wysłaliśmy link..." }
```

**Bezpieczeństwo:**
- Zawsze zwraca sukces, nawet jeśli e-mail nie istnieje (zapobiega enumeracji)
- Obsługuje rate limiting z odpowiednimi komunikatami
- Loguje błędy po stronie serwera (console.error)

#### `/api/auth/update-password` (POST)
Endpoint odpowiedzialny za aktualizację hasła.

**Lokalizacja:** `src/pages/api/auth/update-password.ts`

**Funkcjonalność:**
- Walidacja nowego hasła (minimum 6 znaków)
- Sprawdzenie aktywnej sesji użytkownika
- Wywołanie `supabase.auth.updateUser({ password })`
- Wylogowanie użytkownika po zmianie hasła (`supabase.auth.signOut()`)
- Obsługa błędów z mapowaniem na język polski

**Przepływ:**
```typescript
POST /api/auth/update-password
Body: { password: string }

↓ Walidacja sesji
↓ Walidacja hasła (Zod)
↓ supabase.auth.updateUser()

Response: { message: "Hasło zostało pomyślnie zaktualizowane" }
```

**Wymagania:**
- Użytkownik MUSI mieć aktywną sesję (ustawioną przez link z e-maila)
- Nowe hasło musi spełniać wymagania (min. 6 znaków)

### 2. Frontend Components

#### `PasswordRecoveryForm.tsx`
**Lokalizacja:** `src/components/auth/PasswordRecoveryForm.tsx`

**Funkcjonalność:**
- Formularz z polem e-mail
- Walidacja po stronie klienta (react-hook-form + Zod)
- Wyświetlenie komunikatu sukcesu po wysłaniu linku
- Link powrotny do logowania i rejestracji
- Stan ładowania podczas wysyłania żądania

**Stany:**
- `isSubmitting` - formularz w trakcie wysyłania
- `error` - komunikat błędu
- `success` - flaga sukcesu (zmiana widoku)

#### `UpdatePasswordForm.tsx`
**Lokalizacja:** `src/components/auth/UpdatePasswordForm.tsx`

**Funkcjonalność:**
- Komunikat ostrzegawczy informujący o wymaganej zmianie hasła i wylogowaniu
- Formularz z dwoma polami: hasło i potwierdzenie hasła
- Walidacja zgodności haseł (Zod refine)
- Automatyczne przekierowanie do logowania po 2 sekundach
- Wyświetlenie komunikatu sukcesu (wraz z informacją o wylogowaniu)
- Stan ładowania podczas aktualizacji
- **Przycisk "Wyloguj się"** - umożliwia wylogowanie bez zmiany hasła (użytkownik może później zalogować się starym hasłem)

**Walidacja:**
```typescript
UpdatePasswordSchema
  .object({
    password: min 6 znaków,
    confirmPassword: min 6 znaków
  })
  .refine(password === confirmPassword)
```

### 3. Astro Pages

#### `/auth/password-recovery`
**Lokalizacja:** `src/pages/auth/password-recovery.astro`

- Renderowanie `PasswordRecoveryForm` jako komponent React (client:load)
- Layout typu "auth"
- Metadane SEO

#### `/auth/update-password`
**Lokalizacja:** `src/pages/auth/update-password.astro`

- Renderowanie `UpdatePasswordForm` jako komponent React (client:load)
- Layout typu "auth"
- Metadane SEO

## Przepływ Użytkownika (User Flow)

### Krok 1: Żądanie Resetu Hasła
```
Użytkownik → /auth/password-recovery
           → Wpisuje e-mail
           → Submit
           → POST /api/auth/password-recovery
           → Komunikat: "Sprawdź swoją skrzynkę e-mail"
```

### Krok 2: E-mail od Supabase
```
Supabase → Wysyła e-mail z linkiem
        → Link: /auth/callback?code=XXX&next=/auth/update-password
```

### Krok 3: Kliknięcie Linku
```
Użytkownik → Klika link w e-mailu
           → GET /auth/callback?code=XXX&next=/auth/update-password
           → Callback wykrywa recovery flow (next === "/auth/update-password")
           → Callback ustawia cookie: password_recovery_pending=true
           → Callback wymienia kod na sesję (exchangeCodeForSession)
           → Redirect do /auth/update-password
           → Użytkownik ma teraz aktywną sesję + cookie blokujące
```

### Krok 4: Blokada Aplikacji
```
Użytkownik → Ma aktywną sesję + cookie password_recovery_pending=true
           → Próbuje wejść na "/" lub inną stronę
           → Middleware sprawdza cookie
           → Automatyczne przekierowanie do /auth/update-password
           → Użytkownik NIE MOŻE korzystać z aplikacji!
```

### Krok 5: Aktualizacja Hasła
```
Użytkownik → /auth/update-password (jedyna dostępna strona)
           → Widzi komunikat ostrzegawczy o wymaganej zmianie hasła
           → Wpisuje nowe hasło (2x)
           → Submit
           → POST /api/auth/update-password
           → Backend usuwa cookie password_recovery_pending
           → Backend aktualizuje hasło
           → Backend wylogowuje użytkownika (signOut)
           → Komunikat sukcesu: "Zostałeś wylogowany..."
           → Auto-redirect do /auth/login (po 2s)
           → Użytkownik loguje się nowym hasłem
```

### Alternatywa: Wylogowanie Bez Zmiany Hasła
```
Użytkownik → /auth/update-password
           → Widzi przycisk "Wyloguj się" pod formularzem
           → Klika "Wyloguj się"
           → POST /api/auth/logout
           → Backend usuwa cookie password_recovery_pending
           → Backend wylogowuje użytkownika
           → Redirect do /auth/login
           → Użytkownik może się zalogować normalnie starym hasłem
           → Może później poprosić o nowy link resetujący hasło
```

## Integracja z Middleware

### Ścieżki Publiczne

Ścieżki dodane do `PUBLIC_PATHS` w middleware:

```typescript
const PUBLIC_PATHS = [
  "/auth/password-recovery",
  "/auth/update-password",
  "/api/auth/password-recovery",
  "/api/auth/update-password",
  "/auth/callback",
];
```

### Wyjątki dla Zalogowanych Użytkowników

**WAŻNE:** Strona `/auth/update-password` musi być dostępna dla zalogowanych użytkowników, ponieważ link resetowania hasła tworzy aktywną sesję.

```typescript
const AUTH_PAGES_ALLOWED_WHEN_LOGGED_IN = [
  "/auth/callback",
  "/auth/update-password", // Użytkownik musi być zalogowany, aby zaktualizować hasło
];
```

**Dlaczego to jest konieczne:**
1. Link z e-maila prowadzi do `/auth/callback?code=XXX&next=/auth/update-password`
2. Callback wymienia kod na sesję (użytkownik jest teraz zalogowany)
3. Następuje przekierowanie do `/auth/update-password`
4. Bez tego wyjątku, middleware przekierowałby zalogowanego użytkownika do `/`
5. Użytkownik nie miałby możliwości zmiany hasła

**Bezpieczeństwo:**
- Mimo że strona jest dostępna dla zalogowanych użytkowników, endpoint API `/api/auth/update-password` wymaga aktywnej sesji
- Sesja jest tworzona tylko przez kliknięcie w link z e-maila (PKCE flow)
- Link wygasa po określonym czasie (domyślnie 1 godzina)
- Po zmianie hasła użytkownik jest automatycznie wylogowywany - musi zalogować się nowym hasłem
- Komunikat ostrzegawczy na stronie informuje użytkownika o wymaganej zmianie hasła

**Blokada Dostępu (Cookie-Based Access Control):**
- Po kliknięciu w link resetowania hasła, callback ustawia cookie `password_recovery_pending=true`
- Middleware sprawdza to cookie i **blokuje dostęp do całej aplikacji**
- Użytkownik może odwiedzić tylko:
  - `/auth/update-password` - żeby zmienić hasło
  - `/auth/login` - żeby się wylogować i zalogować normalnie
  - `/api/auth/update-password` - endpoint do zmiany hasła
  - `/api/auth/logout` - żeby się wylogować
- **Każda próba wejścia na inną stronę** (np. `/`, `/dashboard`) skutkuje automatycznym przekierowaniem do `/auth/update-password`
- Cookie jest usuwane po:
  - Pomyślnej zmianie hasła
  - Wylogowaniu się
- Cookie wygasa automatycznie po 1 godzinie

## Obsługa Błędów

### Rozszerzona Funkcja `mapAuthErrorToPolish`

**Lokalizacja:** `src/lib/helpers/auth-errors.ts`

Dodano nowe mapowania błędów:

```typescript
// Link wygasł
"password expired" → "Link do resetowania hasła wygasł. Poproś o nowy link"

// To samo hasło
"same password" → "Nowe hasło musi być inne niż poprzednie"
```

### Typy Błędów

1. **Walidacja wejścia (400)**
   - Nieprawidłowy format e-mail
   - Hasło za krótkie
   - Hasła niezgodne

2. **Brak autoryzacji (401)**
   - Sesja wygasła
   - Brak aktywnej sesji

3. **Rate Limiting (429)**
   - Zbyt wiele prób w krótkim czasie

4. **Błędy serwera (500)**
   - Nieoczekiwane błędy systemowe

## Walidacja Danych

### Schematy Zod

**Lokalizacja:** `src/lib/validation/auth.ts`

```typescript
// Password Recovery (tylko e-mail)
PasswordRecoverySchema = z.object({
  email: z.string()
    .min(1, "Adres e-mail jest wymagany")
    .email("Nieprawidłowy format adresu e-mail")
});

// Update Password (hasło + potwierdzenie)
UpdatePasswordSchema = z.object({
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  confirmPassword: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków")
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"]
  }
);
```

## Konfiguracja Supabase

### Config.toml
**Lokalizacja:** `supabase/config.toml`

Istotne ustawienia:

```toml
[auth]
site_url = "http://127.0.0.1:3000"
enable_signup = true
minimum_password_length = 6

[auth.email]
enable_confirmations = false    # E-mail nie wymaga potwierdzenia przy signup
secure_password_change = false  # Nie wymaga re-autentykacji przy zmianie hasła

[auth.rate_limit]
email_sent = 2  # Max 2 e-maile na godzinę (dev)
```

## Bezpieczeństwo

### Implementowane Mechanizmy

1. **Ochrona przed enumeracją e-maili**
   - Endpoint zawsze zwraca sukces, nawet jeśli e-mail nie istnieje
   
2. **Rate Limiting**
   - Supabase ogranicza liczbę wysłanych e-maili
   - Aplikacja odpowiednio obsługuje błędy rate limit

3. **Weryfikacja sesji**
   - Endpoint update-password wymaga aktywnej sesji
   - Sesja jest ustawiana poprzez bezpieczny przepływ PKCE

4. **Secure Cookies**
   - httpOnly: true
   - secure: true
   - sameSite: 'lax'

5. **Walidacja po stronie serwera**
   - Wszystkie dane są walidowane przy użyciu Zod
   - Komunikaty błędów są zmapowane na język polski

## Testowanie

### Lokalne Środowisko Deweloperskie

1. **Inbucket (Email Testing)**
   - URL: http://127.0.0.1:54324
   - Przechwytuje wszystkie e-maile wysyłane przez Supabase
   - Umożliwia sprawdzenie linków resetowania hasła

2. **Supabase Studio**
   - URL: http://127.0.0.1:54323
   - Panel administracyjny
   - Podgląd użytkowników i sesji

### Scenariusze Testowe

#### Test 1: Pełny przepływ odzyskiwania hasła
```
1. Przejdź do /auth/password-recovery
2. Wprowadź istniejący adres e-mail
3. Sprawdź Inbucket (port 54324)
4. Kliknij link w e-mailu
5. Zostaniesz przekierowany do /auth/update-password
6. Wprowadź nowe hasło (2x)
7. Kliknij "Zaktualizuj hasło"
8. Zostaniesz przekierowany do /auth/login
9. Zaloguj się nowym hasłem
```

#### Test 2: Nieistniejący e-mail
```
1. Przejdź do /auth/password-recovery
2. Wprowadź nieistniejący adres e-mail
3. Otrzymujesz komunikat sukcesu (bezpieczeństwo)
4. Brak e-maila w Inbucket
```

#### Test 3: Wygasła sesja
```
1. Uzyskaj link resetujący hasło
2. Poczekaj aż wygaśnie (lub ręcznie usuń sesję)
3. Spróbuj zaktualizować hasło
4. Otrzymujesz błąd: "Sesja wygasła..."
```

#### Test 4: Niezgodne hasła
```
1. Przejdź do /auth/update-password (z aktywną sesją)
2. Wprowadź różne hasła w oba pola
3. Walidacja po stronie klienta pokazuje błąd
4. Nie można wysłać formularza
```

## Zgodność z Wzorcem

Implementacja jest zgodna z istniejącymi endpointami:

| Aspekt | Login | Register | Password Recovery | Update Password |
|--------|-------|----------|-------------------|-----------------|
| Walidacja Zod | ✅ | ✅ | ✅ | ✅ |
| Mapowanie błędów PL | ✅ | ✅ | ✅ | ✅ |
| Status HTTP | ✅ | ✅ | ✅ | ✅ |
| Error handling | ✅ | ✅ | ✅ | ✅ |
| React Hook Form | ✅ | ✅ | ✅ | ✅ |
| Spinner loading | ✅ | ✅ | ✅ | ✅ |
| Layout "auth" | ✅ | ✅ | ✅ | ✅ |

## Pliki Utworzone/Zmodyfikowane

### Nowe Pliki
1. `/src/pages/api/auth/password-recovery.ts` - Backend endpoint (reset żądanie)
2. `/src/pages/api/auth/update-password.ts` - Backend endpoint (zmiana hasła)

### Zmodyfikowane Pliki
1. `/src/lib/helpers/auth-errors.ts` - Dodano mapowania błędów dla password recovery

### Istniejące (Niezmienione)
1. `/src/pages/auth/password-recovery.astro` - Strona żądania resetu
2. `/src/components/auth/PasswordRecoveryForm.tsx` - Formularz żądania resetu
3. `/src/pages/auth/update-password.astro` - Strona aktualizacji hasła
4. `/src/components/auth/UpdatePasswordForm.tsx` - Formularz aktualizacji hasła
5. `/src/lib/validation/auth.ts` - Schematy walidacji (już istniały)
6. `/src/middleware/index.ts` - Middleware (ścieżki już były dodane)

## Konfiguracja Środowiska

### Wymagane Zmienne Środowiskowe
```bash
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# OpenRouter (dla innych funkcji aplikacji)
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Supabase Dashboard - Redirect URLs

W produkcji należy dodać do Supabase Dashboard:

**Authentication → URL Configuration → Redirect URLs:**
```
https://yourdomain.com/auth/callback
```

## Możliwe Rozszerzenia

1. **Custom Email Templates**
   - Możliwość dostosowania wyglądu e-maila resetującego hasło
   - Lokalizacja: `supabase/templates/recovery.html`

2. **Wymagania dotyczące Hasła**
   - Implementacja bardziej zaawansowanych reguł (wielkie/małe litery, cyfry, znaki specjalne)
   - Wizualizacja siły hasła w formularzu

3. **Historia Haseł**
   - Zapobieganie ponownemu użyciu ostatnich X haseł
   - Wymaga dodatkowej logiki w bazie danych

4. **Powiadomienia E-mail**
   - Wysyłanie e-maila potwierdzającego zmianę hasła
   - Wymaga dodatkowego endpointu lub hooka Supabase

## Podsumowanie

Implementacja została wykonana zgodnie z:
- ✅ Wzorcem z istniejących endpointów (login, register)
- ✅ Best practices Supabase Auth dla SSR
- ✅ Guidelines z cursor rules (Astro, React, TypeScript)
- ✅ Bezpieczeństwem (rate limiting, walidacja, ochrona przed enumeracją)
- ✅ UX (komunikaty PL, loading states, auto-redirect)
- ✅ Testowalności (Inbucket, lokalne środowisko Supabase)

Przepływ użytkownika jest intuicyjny i spójny z resztą aplikacji.

