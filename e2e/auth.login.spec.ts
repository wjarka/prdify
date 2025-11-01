import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages";

test.describe("Auth - Logowanie", () => {
  test("powinien zalogować użytkownika danymi testowymi", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Przejdź do strony logowania
    await loginPage.goto();
    await loginPage.waitForLoad();

    // Sprawdź czy formularz jest widoczny
    await loginPage.expectLoginFormVisible();
    await loginPage.expectEmailInputVisible();
    await loginPage.expectPasswordInputVisible();
    await loginPage.expectSubmitButtonVisible();
    await loginPage.expectSubmitButtonEnabled();

    // Zaloguj się używając danych testowych z .env.test
    await loginPage.loginWithTestCredentials();

    // Czekaj na zakończenie procesu logowania
    await loginPage.waitForLoginComplete();

    // Sprawdź przekierowanie na dashboard
    await expect(page).toHaveURL("/");
  });

  test("powinien wyświetlić błąd przy nieprawidłowych danych logowania", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Przejdź do strony logowania
    await loginPage.goto();
    await loginPage.waitForLoad();

    // Wypełnij formularz nieprawidłowymi danymi
    await loginPage.fillLoginForm({
      email: "nieistniejacy@example.com",
      password: "nieprawidlowehaslo",
    });

    // Kliknij przycisk logowania
    await loginPage.clickSubmit();

    // Sprawdź czy wyświetlony został alert z błędem
    await loginPage.expectErrorAlertVisible();

    // Sprawdź czy nadal jesteśmy na stronie logowania (brak przekierowania)
    await expect(page).toHaveURL("/auth/login");
  });

  test("powinien przejść do strony rejestracji z linku", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Przejdź do strony logowania
    await loginPage.goto();
    await loginPage.waitForLoad();

    // Sprawdź czy link rejestracji jest widoczny
    await loginPage.expectRegisterLinkVisible();

    // Kliknij link rejestracji
    await loginPage.goToRegister();

    // Sprawdź przekierowanie na stronę rejestracji
    await expect(page).toHaveURL("/auth/register");
  });

  test("powinien przejść do strony odzyskiwania hasła z linku", async ({ page }) => {
    const loginPage = new LoginPage(page);

    // Przejdź do strony logowania
    await loginPage.goto();
    await loginPage.waitForLoad();

    // Sprawdź czy link odzyskiwania hasła jest widoczny
    await loginPage.expectPasswordRecoveryLinkVisible();

    // Kliknij link odzyskiwania hasła
    await loginPage.goToPasswordRecovery();

    // Sprawdź przekierowanie na stronę odzyskiwania hasła
    await expect(page).toHaveURL("/auth/password-recovery");
  });
});
