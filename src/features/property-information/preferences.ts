import { z } from "zod";

export const rentalOptions = [
  ["anyone", "Anyone"],
  ["families", "Families"],
  ["couples", "Couples"],
  ["married_couples", "Married couples"],
  ["unmarried_couples", "Unmarried couples"],
  ["bachelors", "Bachelors"],
  ["male_bachelors", "Male bachelors"],
  ["female_bachelors", "Female bachelors"],
  ["women", "Women tenants"],
  ["men", "Men tenants"],
  ["students", "Students"],
  ["working_professionals", "Working professionals"],
] as const;

export type RentalPreference = (typeof rentalOptions)[number][0];
export const rentalPreferencesSchema = z.array(z.enum(rentalOptions.map(([value]) => value)))
  .max(rentalOptions.length)
  .refine(values => new Set(values).size === values.length, "Choose each rental preference once.")
  .refine(values => !values.includes("anyone") || values.length === 1, "Choose Anyone alone or select specific groups.");

export const rentalLabels = (values: RentalPreference[]) =>
  rentalOptions.filter(([value]) => values.includes(value)).map(([,label]) => label);
