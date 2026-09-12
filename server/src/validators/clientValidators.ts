import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  company: z.string().min(1).max(200),
});

export const updateClientSchema = createClientSchema.partial();
