import { z } from "zod";

export const createEmployeeSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required"),

  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(
      /^[0-9+\-\s()]+$/,
      "Please enter a valid phone number"
    )});