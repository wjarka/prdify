import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PasswordRecoverySchema, type PasswordRecoveryFormData } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export const PasswordRecoveryForm: FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordRecoveryFormData>({
    resolver: zodResolver(PasswordRecoverySchema),
  });

  const onSubmit = async (data: PasswordRecoveryFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Nie udało się wysłać linku resetującego hasło");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd podczas przetwarzania żądania");
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
              <p className="font-medium">Link został wysłany!</p>
              <p>
                Sprawdź swoją skrzynkę e-mail. Jeśli konto o podanym adresie istnieje, otrzymasz wiadomość z linkiem
                do resetowania hasła.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Link będzie ważny przez ograniczony czas. Jeśli nie otrzymasz wiadomości, sprawdź folder ze spamem.
              </p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="text-center">
          <a href="/auth/login" className="text-sm text-primary hover:underline">
            Wróć do logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Adres e-mail</Label>
        <Input id="email" type="email" placeholder="twoj@email.pl" disabled={isSubmitting} {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        {!errors.email && (
          <p className="text-xs text-muted-foreground">Wyślemy Ci link do resetowania hasła na podany adres e-mail</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Wysyłanie linku...
            </>
          ) : (
            "Wyślij link resetujący"
          )}
        </Button>

        <div className="text-center text-sm space-y-2">
          <a href="/auth/login" className="text-muted-foreground hover:text-primary transition-colors">
            Wróć do logowania
          </a>
          <p className="text-muted-foreground">
            Nie masz konta?{" "}
            <a href="/auth/register" className="text-primary hover:underline font-medium">
              Zarejestruj się
            </a>
          </p>
        </div>
      </div>
    </form>
  );
};

export default PasswordRecoveryForm;
