import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdatePasswordSchema, type UpdatePasswordFormData } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export const UpdatePasswordForm: FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(UpdatePasswordSchema),
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Nie udało się wylogować");
      }

      // Przekierowanie do logowania
      window.location.href = "/auth/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas wylogowania");
      setIsLoggingOut(false);
    }
  };

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: data.password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Nie udało się zaktualizować hasła");
      }

      setSuccess(true);

      // Przekierowanie po 2 sekundach
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas aktualizacji hasła");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Hasło zostało zaktualizowane!</p>
              <p>Za chwilę zostaniesz przekierowany do strony logowania...</p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Alert>
        <AlertDescription>
          <p className="font-medium">Ważne!</p>
          <p className="text-sm mt-1">
            Po zmianie hasła zostaniesz automatycznie wylogowany i będziesz musiał zalogować się ponownie używając
            nowego hasła.
          </p>
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="password">Nowe hasło</Label>
        <Input id="password" type="password" placeholder="••••••••" disabled={isSubmitting} {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        {!errors.password && <p className="text-xs text-muted-foreground">Hasło musi mieć co najmniej 6 znaków</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          disabled={isSubmitting}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>

      <div className="space-y-3">
        <Button type="submit" disabled={isSubmitting || isLoggingOut} className="w-full">
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Aktualizowanie hasła...
            </>
          ) : (
            "Zaktualizuj hasło"
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">lub</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          disabled={isSubmitting || isLoggingOut}
          className="w-full"
        >
          {isLoggingOut ? (
            <>
              <Spinner size="sm" />
              Wylogowywanie...
            </>
          ) : (
            "Wyloguj się bez zmiany hasła"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Jeśli przypadkowo kliknąłeś link resetujący hasło, możesz się wylogować i zalogować ponownie używając
          dotychczasowego hasła.
        </p>
      </div>
    </form>
  );
};

export default UpdatePasswordForm;
