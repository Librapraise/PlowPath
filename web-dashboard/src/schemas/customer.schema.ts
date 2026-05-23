import { z } from 'zod';

// Mirrors backend/src/controllers/customers.controller.ts upsertSchema so
// the dashboard's client-side validation matches what the API accepts.
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: z.string().min(3, 'Address must be at least 3 characters'),
  phone: z.string().max(32).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'prospect']).default('active'),
  property_type: z.enum(['residential', 'commercial']).default('residential'),
  driveway_type: z.string().max(64).optional().or(z.literal('')),
  access_notes: z.string().optional().or(z.literal('')),
  notify_sms: z.boolean().default(true),
  notify_voice: z.boolean().default(false),
  // Geocode preview fills these from Nominatim; user can override.
  lat: z
    .union([z.number().min(-90).max(90), z.nan()])
    .optional()
    .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined)),
  lon: z
    .union([z.number().min(-180).max(180), z.nan()])
    .optional()
    .transform((v) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined)),
});

export type CustomerInput = z.infer<typeof customerSchema>;
