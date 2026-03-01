import { z } from "zod";

// BE DTO alignment:
//   RegisterRequest.java — username: @Size(min=3, max=20), password: @Size(min=8, max=100)
//   LoginRequest.java    — username: @NotBlank, password: @NotBlank

/**
 * Schema for username validation.
 * - 3-20 characters
 * - Lowercase alphanumeric and underscores only
 * - Automatically trimmed and lowercased
 */
export const usernameSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username must be 20 characters or less")
      .regex(
        /^[a-z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ),
  );

/**
 * Schema for password validation.
 * - Minimum 8 characters
 * - Maximum 100 characters
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be 100 characters or less");

/**
 * Schema for login form validation.
 * Uses relaxed password validation (just checks not empty).
 */
export const loginFormSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

/**
 * Schema for registration credentials form.
 * Includes password confirmation with match validation.
 */
export const credentialsFormSchema = z
  .object({
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type CredentialsFormData = z.infer<typeof credentialsFormSchema>;
