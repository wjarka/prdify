/**
 * Maps Supabase Auth error messages to Polish user-friendly messages
 */
export function mapAuthErrorToPolish(error: string | undefined): string {
  if (!error) {
    return "Wystąpił nieznany błąd podczas uwierzytelniania";
  }

  const errorLower = error.toLowerCase();

  // Login errors
  if (errorLower.includes("invalid login credentials") || errorLower.includes("invalid credentials")) {
    return "Nieprawidłowy adres e-mail lub hasło";
  }

  // Email confirmation errors
  if (errorLower.includes("email not confirmed")) {
    return "Adres e-mail nie został potwierdzony. Sprawdź swoją skrzynkę pocztową";
  }

  // Rate limiting
  if (errorLower.includes("too many requests") || errorLower.includes("rate limit")) {
    return "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę";
  }

  // User already exists
  if (errorLower.includes("user already registered") || errorLower.includes("already exists")) {
    return "Użytkownik o tym adresie e-mail już istnieje";
  }

  // Weak password
  if (errorLower.includes("password") && errorLower.includes("weak")) {
    return "Hasło jest zbyt słabe. Użyj silniejszego hasła";
  }

  // Invalid email format
  if (errorLower.includes("invalid email")) {
    return "Nieprawidłowy format adresu e-mail";
  }

  // Session errors
  if (errorLower.includes("session not found") || errorLower.includes("no session")) {
    return "Sesja wygasła. Zaloguj się ponownie";
  }

  // Network errors
  if (errorLower.includes("network") || errorLower.includes("fetch")) {
    return "Błąd połączenia. Sprawdź połączenie z internetem";
  }

  // Default fallback
  return "Wystąpił błąd podczas uwierzytelniania. Spróbuj ponownie";
}
