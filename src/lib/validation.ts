import { z } from 'zod';

// Valid player names - must match exactly
export const PLAYER_NAMES = [
  'Alessio Livi', 'Alessio Pecci', 'Alex', 'Elisa', 'Fabio', 'Filippo',
  'Francesco', 'Gaetano', 'Giorgia', 'Giulia', 'Greta', 'Laura',
  'Martina', 'Matteo', 'Nisia', 'Tobias'
] as const;

// Grade value schema - allows null or any non-negative number
export const gradeValueSchema = z.number()
  .min(0, 'Il voto deve essere almeno 0')
  .nullable();

// Custom grade (>10) schema
export const customGradeSchema = z.number()
  .min(10.01, 'Il voto personalizzato deve essere maggiore di 10');

// Date validation - reasonable range
const minDate = new Date('2020-01-01');
const maxDate = new Date();
maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow up to 1 year in future

export const gradeSheetSchema = z.object({
  sheet_date: z.string().refine(dateStr => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date >= minDate && date <= maxDate;
  }, 'Data non valida'),
  note: z.string().max(500, 'La nota non può superare 500 caratteri').optional().nullable(),
});

// Player grade schema
export const playerGradeSchema = z.object({
  player_name: z.enum(PLAYER_NAMES, { errorMap: () => ({ message: 'Giocatore non valido' }) }),
  ricezione: gradeValueSchema,
  attacco: gradeValueSchema,
  difesa: gradeValueSchema,
  battuta: gradeValueSchema,
});

// Validate a custom grade value
export const validateCustomGrade = (value: string): { valid: boolean; value?: number; error?: string } => {
  const parsed = parseFloat(value);
  
  if (isNaN(parsed)) {
    return { valid: false, error: 'Inserisci un numero valido' };
  }
  
  const result = customGradeSchema.safeParse(parsed);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0]?.message };
  }
  
  return { valid: true, value: parsed };
};

// Validate grade sheet data before save
export const validateGradeSheet = (data: { sheet_date: string; note?: string | null }) => {
  return gradeSheetSchema.safeParse(data);
};
