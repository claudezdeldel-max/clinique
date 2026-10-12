import { z } from "zod"

export const taskSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  email: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  gender: z.string().optional(),
  social_sec_no: z.string().optional(),
  phone: z.string().optional(),
  birth_date: z.string().optional(),
  prescribing_doctor: z.string().optional(),
  created_at: z.string().optional(),
  // Keep legacy fields for compatibility
  title: z.string().optional(),
  status: z.string().optional(),
  label: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
})

export type Task = z.infer<typeof taskSchema>
