import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, type LoginFormData } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export const LoginForm: FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    // Check for error in URL parameters (e.g., from callback redirect)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get("error");
      if (urlError) {
        const errorMessages: Record<string, string> = {
          missing_code: "Brak kodu weryfikacyjnego",
          invalid_code: "Nieprawidłowy kod weryfikacyjny. Link mógł wygasnąć",
          unexpected_error: "Wystąpił nieoczekiwany błąd podczas weryfikacji",
        };
        return errorMessages[urlError] || "Wystąpił błąd podczas weryfikacji";
      }
    }
    return null;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nieprawidłowe dane logowania");
      }

      // Przekierowanie po pomyślnym zalogowaniu
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas logowania");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="login-form">
      {error && (
        <Alert variant="destructive" data-testid="login-error-alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Adres e-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="twoj@email.pl"
          disabled={isSubmitting}
          {...register("email")}
          data-testid="login-email-input"
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          disabled={isSubmitting}
          {...register("password")}
          data-testid="login-password-input"
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="login-submit-button">
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Logowanie...
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>

        <div className="text-center text-sm space-y-2">
          <a
            href="/auth/password-recovery"
            className="text-muted-foreground hover:text-primary transition-colors"
            data-testid="login-password-recovery-link"
          >
            Zapomniałeś hasła?
          </a>
          <p className="text-muted-foreground">
            Nie masz konta?{" "}
            <a
              href="/auth/register"
              className="text-primary hover:underline font-medium"
              data-testid="login-register-link"
            >
              Zarejestruj się
            </a>
          </p>
        </div>
      </div>
    </form>
  );
};

export default LoginForm;
