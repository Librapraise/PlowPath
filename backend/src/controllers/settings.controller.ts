import type { Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/db';
import { HttpError } from '../utils/httpError';

// Zod schema for validation of organization-wide settings
const organizationSettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  support_phone: z.string().nullable().optional(),
  support_email: z.string().email('Invalid email address').nullable().optional(),
  settings: z.object({
    storm_accumulation_threshold_inches: z.number().nonnegative(),
    message_templates: z.object({
      sms_pre_storm: z.string().min(1, 'Pre-storm template is required'),
      sms_en_route: z.string().min(1, 'En-route template is required'),
      sms_completed: z.string().min(1, 'Completed template is required'),
      email_overdue: z.string().min(1, 'Overdue email template is required').optional(),
    }),
    quiet_hours: z.object({
      enabled: z.boolean(),
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be HH:MM format'),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be HH:MM format'),
    }),
    geocoding_bounds: z.object({
      min_lat: z.number(),
      min_lon: z.number(),
      max_lat: z.number(),
      max_lon: z.number(),
    }).nullable().optional(),
    pricing: z.object({
      residential_rate: z.number().nonnegative(),
      commercial_rate: z.number().nonnegative(),
      fuel_price_per_gallon: z.number().nonnegative(),
      vehicle_mpg: z.number().positive(),
      overhead_percentage: z.number().nonnegative(),
    }).optional(),
  }),
});

// Zod schema for driver specific device state preferences
const driverSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']),
  theme_mode: z.enum(['light', 'dark', 'auto']).optional(),
  navigation_app: z.enum(['google_maps', 'apple_maps', 'waze']),
  tracking_accuracy: z.enum(['high', 'power_saver']),
  upload_frequency_seconds: z.number().int().positive(),
  high_contrast_map: z.boolean().optional(),
});

// 🖥️ GET /api/v1/settings
export async function getSettings(req: Request, res: Response): Promise<void> {
  const { rows } = await query(
    `SELECT settings_id, company_name, support_phone, support_email, settings
       FROM organization_settings
      LIMIT 1`
  );
  
  if (rows.length === 0) {
    throw HttpError.notFound('Organization settings not found');
  }

  res.json(rows[0]);
}

// 🖥️ PUT /api/v1/settings
export async function updateSettings(req: Request, res: Response): Promise<void> {
  const parsed = organizationSettingsSchema.parse(req.body);

  const { rows } = await query(
    `UPDATE organization_settings
        SET company_name = $1,
            support_phone = $2,
            support_email = $3,
            settings = $4,
            updated_at = NOW()
     RETURNING settings_id, company_name, support_phone, support_email, settings`,
    [
      parsed.company_name,
      parsed.support_phone ?? null,
      parsed.support_email ?? null,
      JSON.stringify(parsed.settings),
    ]
  );

  if (rows.length === 0) {
    throw HttpError.notFound('Organization settings row not found for update');
  }

  res.json(rows[0]);
}

// 🖥️ GET /api/v1/settings/organizations
export async function getOtherOrganizations(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || !user.orgId) {
    throw HttpError.badRequest('User does not belong to an organization');
  }

  const { rows } = await query(
    `SELECT settings_id, company_name
       FROM organization_settings
      WHERE settings_id != $1`,
    [user.orgId]
  );

  res.json(rows);
}

// 📱 GET /api/v1/drivers/me/settings
export async function getDriverSettings(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || !user.driverId) {
    throw HttpError.forbidden('Only authenticated drivers can access these settings');
  }

  const { rows } = await query<{ settings_json: any }>(
    `SELECT settings_json
       FROM drivers
      WHERE driver_id = $1 AND deleted_at IS NULL`,
    [user.driverId]
  );

  if (rows.length === 0) {
    throw HttpError.notFound('Driver preferences not found');
  }

  res.json(rows[0].settings_json);
}

// 📱 PUT /api/v1/drivers/me/settings
export async function updateDriverSettings(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || !user.driverId) {
    throw HttpError.forbidden('Only authenticated drivers can modify these settings');
  }

  const parsed = driverSettingsSchema.parse(req.body);

  const { rows } = await query<{ settings_json: any }>(
    `UPDATE drivers
        SET settings_json = $1,
            updated_at = NOW()
      WHERE driver_id = $2 AND deleted_at IS NULL
     RETURNING settings_json`,
    [JSON.stringify(parsed), user.driverId]
  );

  if (rows.length === 0) {
    throw HttpError.notFound('Driver profile not active or found for settings update');
  }

  res.json(rows[0].settings_json);
}
