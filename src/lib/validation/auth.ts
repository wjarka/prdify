import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().min(1, "Adres e-mail jest wymagany").email("Nieprawidłowy format adresu e-mail"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const RegisterSchema = z.object({
  email: z.string().min(1, "Adres e-mail jest wymagany").email("Nieprawidłowy format adresu e-mail"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const PasswordRecoverySchema = z.object({
  email: z.string().min(1, "Adres e-mail jest wymagany").email("Nieprawidłowy format adresu e-mail"),
});

export const UpdatePasswordSchema = z
  .object({
    password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
    confirmPassword: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;
export type PasswordRecoveryFormData = z.infer<typeof PasswordRecoverySchema>;
export type UpdatePasswordFormData = z.infer<typeof UpdatePasswordSchema>;
