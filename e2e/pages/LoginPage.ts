import { expect, type Page, type Locator } from "@playwright/test";

export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Page Object Model dla strony logowania
 * Zawiera lokatory i metody do interakcji z formularzem logowania
 */
export class LoginPage {
  readonly page: Page;

  // Lokatory formularza
  readonly loginForm: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  // Lokatory komunikatów i linków
  readonly errorAlert: Locator;
  readonly passwordRecoveryLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Lokatory formularza
    this.loginForm = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");

    // Lokatory komunikatów i linków
    this.errorAlert = page.getByTestId("login-error-alert");
    this.passwordRecoveryLink = page.getByTestId("login-password-recovery-link");
    this.registerLink = page.getByTestId("login-register-link");
  }

  /**
   * Przechodzi do strony logowania
   */
  async goto(): Promise<void> {
    await this.page.goto("/auth/login", { waitUntil: "networkidle" });
  }

  /**
   * Wypełnia pole email
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Wypełnia pole hasła
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Wypełnia formularz logowania
   */
  async fillLoginForm(data: LoginFormData): Promise<void> {
    await this.fillEmail(data.email);
    await this.fillPassword(data.password);
  }

  /**
   * Klika przycisk "Zaloguj się"
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Wykonuje pełny proces logowania (wypełnia formularz i klika submit)
   */
  async login(data: LoginFormData): Promise<void> {
    await this.fillLoginForm(data);
    await this.clickSubmit();
  }

  /**
   * Loguje się używając danych z zmiennych środowiskowych (.env.test)
   */
  async loginWithTestCredentials(): Promise<void> {
    const email = process.env.E2E_USERNAME;
    const password = process.env.E2E_PASSWORD;

    if (!email || !password) {
      throw new Error("E2E_USERNAME i E2E_PASSWORD muszą być zdefiniowane w .env.test");
    }

    await this.login({ email, password });
  }

  /**
   * Przechodzi do strony odzyskiwania hasła
   */
  async goToPasswordRecovery(): Promise<void> {
    await this.passwordRecoveryLink.click();
  }

  /**
   * Przechodzi do strony rejestracji
   */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }

  /**
   * Sprawdza czy formularz logowania jest widoczny
   */
  async expectLoginFormVisible(): Promise<void> {
    await expect(this.loginForm).toBeVisible();
  }

  /**
   * Sprawdza czy pole email jest widoczne
   */
  async expectEmailInputVisible(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * Sprawdza czy pole hasła jest widoczne
   */
  async expectPasswordInputVisible(): Promise<void> {
    await expect(this.passwordInput).toBeVisible();
  }

  /**
   * Sprawdza czy przycisk submit jest widoczny
   */
  async expectSubmitButtonVisible(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  /**
   * Sprawdza czy przycisk submit jest aktywny (nie disabled)
   */
  async expectSubmitButtonEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Sprawdza czy przycisk submit jest nieaktywny (disabled)
   */
  async expectSubmitButtonDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Sprawdza czy alert z błędem jest widoczny
   */
  async expectErrorAlertVisible(): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
  }

  /**
   * Sprawdza czy alert z błędem jest ukryty
   */
  async expectErrorAlertHidden(): Promise<void> {
    await expect(this.errorAlert).toBeHidden();
  }

  /**
   * Sprawdza czy alert z błędem zawiera określony tekst
   */
  async expectErrorAlertText(text: string): Promise<void> {
    await expect(this.errorAlert).toContainText(text);
  }

  /**
   * Sprawdza czy link odzyskiwania hasła jest widoczny
   */
  async expectPasswordRecoveryLinkVisible(): Promise<void> {
    await expect(this.passwordRecoveryLink).toBeVisible();
  }

  /**
   * Sprawdza czy link rejestracji jest widoczny
   */
  async expectRegisterLinkVisible(): Promise<void> {
    await expect(this.registerLink).toBeVisible();
  }

  /**
   * Sprawdza czy pole email ma określoną wartość
   */
  async expectEmailValue(email: string): Promise<void> {
    await expect(this.emailInput).toHaveValue(email);
  }

  /**
   * Sprawdza czy pole hasła jest puste (ze względów bezpieczeństwa nie sprawdzamy wartości)
   */
  async expectPasswordEmpty(): Promise<void> {
    const value = await this.passwordInput.inputValue();
    expect(value).toBe("");
  }

  /**
   * Czeka na załadowanie strony logowania (sprawdza czy formularz jest widoczny)
   */
  async waitForLoad(): Promise<void> {
    // Najpierw czekaj na poprawne URL
    await this.page.waitForURL("/auth/login", { timeout: 10000 });

    await this.expectLoginFormVisible();
  }

  /**
   * Czeka na zakończenie procesu logowania (czeka na przekierowanie na dashboard)
   */
  async waitForLoginComplete(): Promise<void> {
    // Czeka na przekierowanie na dashboard (sukces) lub pozostanie na stronie logowania (błąd)
    // Używamy waitForURL z konkretnym timeoutem i sprawdzamy wynik
    try {
      // Jeśli logowanie się powiodło, powinniśmy być przekierowani na dashboard
      await this.page.waitForURL("/", { timeout: 10000 });
    } catch {
      // Jeśli timeout, sprawdź czy nadal jesteśmy na stronie logowania (błąd logowania)
      const currentUrl = this.page.url();
      if (!currentUrl.includes("/auth/login")) {
        // Jeśli nie jesteśmy na login ani na dashboard, może być inne przekierowanie
        // Poczekaj na stabilizację URL
        await this.page.waitForLoadState("networkidle");
      }
      // Jeśli nadal jesteśmy na /auth/login, to znaczy że logowanie się nie powiodło
      // W takim przypadku nie rzucamy błędu - test powinien sprawdzić error alert
    }
  }
}
