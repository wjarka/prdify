<authentication_analysis>
1.  **Przepływy autentykacji:**
    *   **Rejestracja użytkownika:** Nowy użytkownik zakłada konto za pomocą adresu e-mail i hasła. Po pomyślnej rejestracji jest automatycznie logowany i przekierowywany do panelu głównego.
    *   **Logowanie użytkownika:** Zarejestrowany użytkownik loguje się, podając e-mail i hasło. Po pomyślnym zalogowaniu uzyskuje dostęp do chronionych zasobów. W przypadku niepowodzenia otrzymuje komunikat o błędzie.
    *   **Dostęp do chronionych zasobów:** System weryfikuje, czy użytkownik ma aktywną sesję przy każdej próbie dostępu do chronionej strony. Jeśli sesja jest nieważna, użytkownik jest przekierowywany na stronę logowania.
    *   **Wylogowanie:** Użytkownik kończy swoją sesję, co powoduje unieważnienie tokenów i usunięcie ciasteczek sesyjnych.
    *   **Odzyskiwanie hasła:** Użytkownik może zainicjować proces resetowania hasła poprzez e-mail.

2.  **Główni aktorzy i ich interakcje:**
    *   **Przeglądarka:** Interfejs użytkownika, z którym wchodzi w interakcję użytkownik. Renderuje formularze (React) i wysyła żądania do backendu.
    *   **Middleware (Astro):** Pośrednik po stronie serwera, który przechwytuje wszystkie żądania. Odpowiada za weryfikację sesji użytkownika przed udzieleniem dostępu do chronionych stron.
    *   **Astro API:** Punkty końcowe backendu, które obsługują logikę biznesową: rejestrację, logowanie, wylogowanie itp. Komunikują się z Supabase Auth.
    *   **Supabase Auth:** Zewnętrzna usługa odpowiedzialna za zarządzanie użytkownikami, sesjami i tokenami JWT.

3.  **Procesy weryfikacji i odświeżania tokenów:**
    *   **Weryfikacja:** Middleware przy każdym żądaniu do chronionej trasy odczytuje tokeny JWT z ciasteczek `HttpOnly` i weryfikuje ich ważność za pomocą serwerowego klienta Supabase (`@supabase/ssr`).
    *   **Odświeżanie:** Biblioteka `@supabase/ssr` automatycznie zarządza odświeżaniem tokenów. Gdy Middleware weryfikuje sesję, a token dostępowy (access token) jest bliski wygaśnięcia, biblioteka używa tokenu odświeżającego (refresh token) do uzyskania nowego tokenu dostępowego od Supabase Auth, zapewniając ciągłość sesji bez przerywania pracy użytkownika.

4.  **Opis kroków autentykacji:**
    *   **Rejestracja/Logowanie:** Użytkownik podaje dane w formularzu. Przeglądarka wysyła je do `Astro API`. API woła odpowiednią metodę `Supabase Auth`. Jeśli operacja się powiedzie, Supabase generuje tokeny JWT, a serwer (`@supabase/ssr`) ustawia je w ciasteczkach w odpowiedzi do przeglądarki.
    *   **Dostęp do strony:** Przeglądarka wysyła żądanie. `Middleware` sprawdza ciasteczka. Jeśli sesja jest ważna (tokeny są poprawne i niewygasłe), żądanie jest przepuszczane. Jeśli nie, następuje przekierowanie do strony logowania.
    *   **Wylogowanie:** Przeglądarka wysyła żądanie do `Astro API`. API wywołuje metodę wylogowania w `Supabase Auth`, a serwer usuwa ciasteczka sesyjne.
</authentication_analysis>

<mermaid_diagram>
```mermaid
sequenceDiagram
    autonumber

    participant Przeglądarka
    participant Middleware
    participant Astro API
    participant Supabase Auth

    Note over Przeglądarka, Supabase Auth: Przepływ Rejestracji Użytkownika

    activate Przeglądarka
    Przeglądarka->>Astro API: POST /api/auth/register (email, hasło)
    activate Astro API
    Astro API->>Supabase Auth: signUp(email, hasło)
    activate Supabase Auth
    Supabase Auth-->>Astro API: Utworzono użytkownika i sesję
    deactivate Supabase Auth
    
    Note right of Astro API: @supabase/ssr ustawia ciasteczka sesji
    Astro API-->>Przeglądarka: 200 OK
    deactivate Astro API
    
    Przeglądarka->>Przeglądarka: Przekierowanie na /dashboard
    deactivate Przeglądarka

    Note over Przeglądarka, Supabase Auth: Przepływ Logowania Użytkownika

    activate Przeglądarka
    Przeglądarka->>Astro API: POST /api/auth/login (email, hasło)
    activate Astro API
    Astro API->>Supabase Auth: signInWithPassword(email, hasło)
    activate Supabase Auth

    alt Prawidłowe dane
        Supabase Auth-->>Astro API: Pomyślnie uwierzytelniono, sesja utworzona
        Note right of Astro API: @supabase/ssr ustawia ciasteczka sesji
        Astro API-->>Przeglądarka: 200 OK
        Przeglądarka->>Przeglądarka: Przekierowanie na /dashboard
    else Błędne dane
        Supabase Auth-->>Astro API: Błąd uwierzytelnienia
        Astro API-->>Przeglądarka: 401 Unauthorized (Błędne dane)
        Przeglądarka->>Przeglądarka: Wyświetl komunikat o błędzie
    end
    deactivate Supabase Auth
    deactivate Astro API
    deactivate Przeglądarka

    Note over Przeglądarka, Supabase Auth: Dostęp do Chronionej Strony i Odświeżanie Tokenu

    activate Przeglądarka
    Przeglądarka->>Middleware: GET /dashboard
    activate Middleware
    Note right of Middleware: Odczyt ciasteczek i weryfikacja sesji
    Middleware->>Supabase Auth: getUser(jwt_z_ciasteczka)
    activate Supabase Auth

    alt Sesja jest aktywna
        Supabase Auth-->>Middleware: Zwraca dane użytkownika
        Note right of Supabase Auth: Jeśli token wygasa, @supabase/ssr go odświeża
        Middleware->>Middleware: Zezwól na dostęp, renderuj stronę
        Middleware-->>Przeglądarka: Zwraca kod HTML strony /dashboard
    else Sesja wygasła / nie istnieje
        Supabase Auth-->>Middleware: Brak aktywnej sesji
        Middleware-->>Przeglądarka: 302 Redirect na /login
    end
    deactivate Supabase Auth
    deactivate Middleware
    deactivate Przeglądarka

    Note over Przeglądarka, Supabase Auth: Przepływ Wylogowania Użytkownika

    activate Przeglądarka
    Przeglądarka->>Astro API: POST /api/auth/logout
    activate Astro API
    Astro API->>Supabase Auth: signOut()
    activate Supabase Auth
    Supabase Auth-->>Astro API: Sesja unieważniona
    deactivate Supabase Auth
    
    Note right of Astro API: @supabase/ssr usuwa ciasteczka sesji
    Astro API-->>Przeglądarka: 302 Redirect na /login
    deactivate Astro API
    deactivate Przeglądarka
```
</mermaid_diagram>
