import { expect, type Page, type Locator } from "@playwright/test";
import { LoginPage, type LoginFormData } from "./LoginPage";

export interface CreatePrdFormData {
  name: string;
  mainProblem: string;
  inScope: string;
  outOfScope: string;
  successCriteria: string;
}

/**
 * Page Object Model dla strony Dashboardu
 * Zawiera lokatory i metody do interakcji z elementami dashboardu
 * Wymaga zalogowania użytkownika przed dostępem
 */
export class DashboardPage {
  readonly page: Page;
  private loginPage: LoginPage;

  // Lokatory główne
  readonly createPrdButton: Locator;
  readonly createPrdDialog: Locator;
  readonly createPrdForm: Locator;

  // Lokatory formularza tworzenia PRD
  readonly nameInput: Locator;
  readonly mainProblemTextarea: Locator;
  readonly inScopeTextarea: Locator;
  readonly outOfScopeTextarea: Locator;
  readonly successCriteriaTextarea: Locator;
  readonly submitButton: Locator;

  // Lokatory listy PRD
  readonly prdCards: Locator;
  readonly emptyState: Locator;
  readonly emptyStateCreateButton: Locator;

  // Lokatory paginacji
  readonly pagination: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageButtons: Locator;

  // Lokatory dialogu potwierdzenia usunięcia
  readonly deleteConfirmationDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);

    // Lokatory główne
    this.createPrdButton = page.getByTestId("create-prd-button");
    this.createPrdDialog = page.getByTestId("create-prd-dialog");
    this.createPrdForm = page.getByTestId("create-prd-form");

    // Lokatory formularza
    this.nameInput = page.getByTestId("create-prd-name-input");
    this.mainProblemTextarea = page.getByTestId("create-prd-main-problem-textarea");
    this.inScopeTextarea = page.getByTestId("create-prd-in-scope-textarea");
    this.outOfScopeTextarea = page.getByTestId("create-prd-out-of-scope-textarea");
    this.successCriteriaTextarea = page.getByTestId("create-prd-success-criteria-textarea");
    this.submitButton = page.getByTestId("create-prd-submit-button");

    // Lokatory listy PRD
    this.prdCards = page.locator('[data-testid^="prd-card-"]');
    this.emptyState = page.getByTestId("prd-empty-state");
    this.emptyStateCreateButton = page.getByTestId("empty-state-create-button");

    // Lokatory paginacji
    this.pagination = page.getByTestId("prd-pagination");
    this.previousPageButton = page.getByTestId("pagination-previous-button");
    this.nextPageButton = page.getByTestId("pagination-next-button");
    this.pageButtons = page.locator('[data-testid^="pagination-page-button-"]');

    // Lokatory dialogu usunięcia
    this.deleteConfirmationDialog = page.getByTestId("delete-prd-confirmation-dialog");
    this.deleteConfirmButton = page.getByTestId("delete-prd-confirm-button");
    this.deleteCancelButton = page.getByTestId("delete-prd-cancel-button");
  }

  /**
   * Przechodzi do strony dashboardu
   * Uwaga: Jeśli użytkownik nie jest zalogowany, zostanie przekierowany na stronę logowania
   */
  async goto(): Promise<void> {
    await this.page.goto("/", { waitUntil: "networkidle" });
  }

  /**
   * Loguje użytkownika używając danych testowych z .env.test
   */
  async loginWithTestCredentials(): Promise<void> {
    await this.loginPage.loginWithTestCredentials();
    await this.loginPage.waitForLoginComplete();
  }

  /**
   * Loguje użytkownika używając podanych danych
   */
  async login(credentials: LoginFormData): Promise<void> {
    await this.loginPage.login(credentials);
    await this.loginPage.waitForLoginComplete();
  }

  /**
   * Zapewnia, że użytkownik jest zalogowany, a następnie przechodzi do dashboardu
   * Jeśli użytkownik nie jest zalogowany, loguje go używając danych testowych
   */
  async gotoAsAuthenticated(): Promise<void> {
    // Przejdź do dashboardu i poczekaj na zakończenie nawigacji
    await this.goto();

    // Poczekaj na zakończenie nawigacji - może przekierować na login lub zostać na dashboardzie
    // Używamy waitForURL z alternatywnymi ścieżkami, aby poczekać na stabilizację URL
    try {
      // Czekamy na jedno z dwóch możliwych URL z timeoutem
      await Promise.race([
        this.page.waitForURL("/", { timeout: 3000 }),
        this.page.waitForURL("/auth/login", { timeout: 3000 }),
      ]);
    } catch {
      // Jeśli timeout, sprawdzamy aktualny URL po zakończeniu nawigacji
      await this.page.waitForLoadState("networkidle");
    }

    // Sprawdź czy jesteśmy na stronie logowania (oznacza brak autoryzacji)
    const currentUrl = this.page.url();
    const isOnLoginPage = currentUrl.includes("/auth/login");

    if (isOnLoginPage) {
      // Użytkownik nie jest zalogowany, zaloguj go
      await this.loginWithTestCredentials();
      // Po zalogowaniu powinniśmy być automatycznie przekierowani na dashboard
      await this.page.waitForURL("/", { timeout: 10000 });
    }

    // Upewnij się, że jesteśmy na dashboardzie i strona się załadowała
    await this.waitForLoad();
  }

  /**
   * Otwiera dialog tworzenia PRD
   */
  async openCreatePrdDialog(): Promise<void> {
    // Wait for button to be actionable before clicking
    await this.createPrdButton.waitFor({ state: "attached" });
    await expect(this.createPrdButton).toBeEnabled();

    // Click the button to open the dialog
    await this.createPrdButton.click();

    // Wait for dialog to be attached to DOM first (ensures Radix UI has rendered it)
    await this.createPrdDialog.waitFor({ state: "attached" });

    // Wait for dialog to be visible (accounting for CSS animations)
    await this.createPrdDialog.waitFor({ state: "visible" });

    // Wait for form inputs to be ready as a final check that dialog is fully loaded
    await this.nameInput.waitFor({ state: "visible" });
  }

  /**
   * Wypełnia formularz tworzenia PRD
   */
  async fillCreatePrdForm(data: CreatePrdFormData): Promise<void> {
    await this.nameInput.fill(data.name);
    await this.mainProblemTextarea.fill(data.mainProblem);
    await this.inScopeTextarea.fill(data.inScope);
    await this.outOfScopeTextarea.fill(data.outOfScope);
    await this.successCriteriaTextarea.fill(data.successCriteria);
  }

  /**
   * Wysyła formularz tworzenia PRD
   */
  async submitCreatePrdForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Tworzy nowy PRD - pełny przepływ (otwiera dialog, wypełnia formularz i wysyła)
   */
  async createPrd(data: CreatePrdFormData): Promise<void> {
    await this.openCreatePrdDialog();
    await this.fillCreatePrdForm(data);
    await this.submitCreatePrdForm();
  }

  /**
   * Sprawdza czy dialog tworzenia PRD jest widoczny
   */
  async expectCreatePrdDialogVisible(): Promise<void> {
    await expect(this.createPrdDialog).toBeVisible();
  }

  /**
   * Sprawdza czy dialog tworzenia PRD jest ukryty
   */
  async expectCreatePrdDialogHidden(): Promise<void> {
    await expect(this.createPrdDialog).toBeHidden();
  }

  /**
   * Pobiera kartę PRD po ID
   */
  getPrdCard(prdId: string): Locator {
    return this.page.getByTestId(`prd-card-${prdId}`);
  }

  /**
   * Pobiera tytuł karty PRD po ID
   */
  getPrdCardTitle(prdId: string): Locator {
    return this.page.getByTestId(`prd-card-title-${prdId}`);
  }

  /**
   * Pobiera menu akcji karty PRD po ID
   */
  getPrdCardActions(prdId: string): Locator {
    return this.page.getByTestId(`prd-card-actions-${prdId}`);
  }

  /**
   * Klika w kartę PRD (otwiera szczegóły)
   */
  async clickPrdCard(prdId: string): Promise<void> {
    await this.getPrdCard(prdId).click();
  }

  /**
   * Otwiera menu akcji dla karty PRD
   */
  async openPrdActionsMenu(prdId: string): Promise<void> {
    const actionsContainer = this.getPrdCardActions(prdId);
    await actionsContainer.getByTestId("prd-actions-menu-trigger").click();
  }

  /**
   * Usuwa PRD - otwiera menu akcji i klika "Usuń"
   */
  async deletePrd(prdId: string): Promise<void> {
    await this.openPrdActionsMenu(prdId);
    await this.page.getByTestId("prd-actions-menu-delete").click();
  }

  /**
   * Potwierdza usunięcie PRD w dialogu potwierdzenia
   */
  async confirmDeletePrd(): Promise<void> {
    await this.deleteConfirmationDialog.waitFor({ state: "visible" });
    await this.deleteConfirmButton.click();
  }

  /**
   * Anuluje usunięcie PRD w dialogu potwierdzenia
   */
  async cancelDeletePrd(): Promise<void> {
    await this.deleteConfirmationDialog.waitFor({ state: "visible" });
    await this.deleteCancelButton.click();
  }

  /**
   * Usuwa PRD - pełny przepływ (otwiera menu, klika usuń, potwierdza)
   */
  async deletePrdWithConfirmation(prdId: string): Promise<void> {
    await this.deletePrd(prdId);
    await this.confirmDeletePrd();
  }

  /**
   * Sprawdza czy dialog potwierdzenia usunięcia jest widoczny
   */
  async expectDeleteConfirmationDialogVisible(): Promise<void> {
    await expect(this.deleteConfirmationDialog).toBeVisible();
  }

  /**
   * Sprawdza czy dialog potwierdzenia usunięcia jest ukryty
   */
  async expectDeleteConfirmationDialogHidden(): Promise<void> {
    await expect(this.deleteConfirmationDialog).toBeHidden();
  }

  /**
   * Sprawdza czy lista PRD jest pusta (empty state)
   */
  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Sprawdza czy lista PRD zawiera karty
   */
  async expectPrdCardsVisible(): Promise<void> {
    await expect(this.prdCards.first()).toBeVisible();
  }

  /**
   * Pobiera liczbę widocznych kart PRD
   */
  async getPrdCardsCount(): Promise<number> {
    return await this.prdCards.count();
  }

  /**
   * Sprawdza czy karta PRD o danym ID jest widoczna
   */
  async expectPrdCardVisible(prdId: string): Promise<void> {
    await expect(this.getPrdCard(prdId)).toBeVisible();
  }

  /**
   * Sprawdza czy karta PRD o danym ID nie jest widoczna
   */
  async expectPrdCardHidden(prdId: string): Promise<void> {
    await expect(this.getPrdCard(prdId)).toBeHidden();
  }

  /**
   * Sprawdza czy karta PRD zawiera określony tytuł
   */
  async expectPrdCardTitle(prdId: string, title: string): Promise<void> {
    await expect(this.getPrdCardTitle(prdId)).toHaveText(title);
  }

  /**
   * Przechodzi do następnej strony paginacji
   */
  async goToNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  /**
   * Przechodzi do poprzedniej strony paginacji
   */
  async goToPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  /**
   * Przechodzi do określonej strony paginacji
   */
  async goToPage(pageNumber: number): Promise<void> {
    await this.page.getByTestId(`pagination-page-button-${pageNumber}`).click();
  }

  /**
   * Sprawdza czy paginacja jest widoczna
   */
  async expectPaginationVisible(): Promise<void> {
    await expect(this.pagination).toBeVisible();
  }

  /**
   * Sprawdza czy paginacja jest ukryta
   */
  async expectPaginationHidden(): Promise<void> {
    await expect(this.pagination).toBeHidden();
  }

  /**
   * Czeka na załadowanie dashboardu (sprawdza czy przycisk tworzenia jest widoczny)
   */
  async waitForLoad(): Promise<void> {
    await this.createPrdButton.waitFor({ state: "visible" });
  }
}
