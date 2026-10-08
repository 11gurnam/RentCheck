import { z } from "zod";

export const aliasSchema = z
  .string()
  .trim()
  .min(3, "Use at least 3 characters.")
  .max(40, "Use 40 characters or fewer.")
  .refine(
    (value) => !/[@<>\p{Cc}]/u.test(value),
    "Avoid email addresses, angle brackets and control characters.",
  );
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));
export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Use 128 characters or fewer."),
});
export const registerSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(128, "Use 128 characters or fewer."),
    confirmPassword: z.string(),
    alias: aliasSchema,
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords do not match.",
  });

// Only known internal destinations can be carried through authentication.
export function safeDestination(value: unknown) {
  return typeof value === "string" &&
    ([
      "/account",
      "/account/reviews",
      "/account/password",
      "/account/privacy",
      "/account/notifications",
      "/messages",
      "/claims",
      "/reviews/new",
      "/admin",
      "/saved",
      "/properties/new",
    ].includes(value) ||
      /^\/reviews\/new\?property=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ) ||
      /^\/properties\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ))
    ? value
    : "/account";
}

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<
    Record<"email" | "password" | "confirmPassword" | "alias", string>
  >;
};
export const initialFormState: FormState = { status: "idle" };
