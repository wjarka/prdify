import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages";

test.describe("Dashboard - Tworzenie PRD", () => {
  test("powinien utworzyć nowy PRD", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Zaloguj się i przejdź do dashboardu
    await dashboardPage.gotoAsAuthenticated();

    const prdData = {
      name: "Testowy projekt PRD",
      mainProblem: "Główny problem do rozwiązania",
      inScope: "Funkcjonalności w zakresie projektu",
      outOfScope: "Funkcjonalności poza zakresem",
      successCriteria: "Kryteria sukcesu projektu",
    };

    // Utwórz PRD używając metody pomocniczej
    await dashboardPage.createPrd(prdData);

    // Sprawdź przekierowanie do strony PRD
    await expect(page).toHaveURL(/\/prds\/[a-z0-9-]+/);
  });
});
