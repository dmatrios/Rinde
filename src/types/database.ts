// Contrato de la migración 202610220001. Regenerar con Supabase CLI al conectar el proyecto.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
};
export type UserSettings = {
  user_id: string;
  currency: "PEN";
  timezone: "America/Lima";
  earnings_mode: "daily" | "shift";
  ruc: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};
export type UserPlatform = {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type Vehicle = {
  user_id: string;
  name: string;
  odometer_km: number | null;
  created_at: string;
  updated_at: string;
};
export type WorkShiftStatus = "active" | "paused" | "completed";
export type PaymentMethod = "cash" | "yape" | "plin" | "card";
export type WorkShift = {
  id: string;
  user_id: string;
  platform_id: string;
  started_at: string;
  ended_at: string | null;
  status: WorkShiftStatus;
  odometer_start: number | null;
  odometer_end: number | null;
  opening_cash: number;
  cash_counted: number | null;
  cash_counted_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ShiftPause = {
  id: string;
  user_id: string;
  shift_id: string;
  started_at: string;
  ended_at: string | null;
  odometer_pause: number | null;
  odometer_resume: number | null;
  created_at: string;
};
export type EarningsMode = "daily" | "shift";
export type Earning = {
  id: string;
  user_id: string;
  platform_id: string;
  date: string;
  mode: EarningsMode;
  shift_id: string | null;
  reported_amount: number;
  tips: number;
  bonuses: number;
  tips_included: boolean;
  bonuses_included: boolean;
  orders: number | null;
  notes: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};
export type EarningsHistory = {
  id: string;
  user_id: string;
  earnings_id: string;
  before_value: Json;
  after_value: Json;
  changed_at: string;
};
export type ExpenseCategoryKind = "operational" | "personal";
export type ExpenseCategory = {
  id: string;
  user_id: string;
  name: string;
  kind: ExpenseCategoryKind;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type ExpenseCadence = "weekly" | "monthly";
export type RecurringExpense = {
  id: string;
  user_id: string;
  category_id: string;
  description: string;
  amount: number;
  cadence: ExpenseCadence;
  anchor_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  occurred_at: string;
  amount: number;
  description: string;
  notes: string | null;
  paid_with_ruc: boolean;
  shift_id: string | null;
  payment_method: PaymentMethod | null;
  cash_paid: number | null;
  recurring_rule_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};
export type FuelRefill = {
  id: string;
  user_id: string;
  occurred_at: string;
  amount: number;
  liters: number | null;
  odometer_km: number | null;
  full_tank: boolean;
  shift_id: string | null;
  payment_method: PaymentMethod | null;
  cash_paid: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
export type PaymentReceipt = {
  id: string;
  user_id: string;
  shift_id: string | null;
  platform_id: string;
  occurred_at: string;
  amount: number;
  payment_method: PaymentMethod;
  cash_received: number | null;
  description: string | null;
  created_at: string;
};
export type Goal = {
  user_id: string;
  weekly_income: number;
  created_at: string;
  updated_at: string;
};
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; display_name: string },
        { display_name?: string }
      >;
      user_settings: Table<
        UserSettings,
        {
          user_id: string;
          currency?: "PEN";
          timezone?: "America/Lima";
          earnings_mode?: "daily" | "shift";
          ruc?: string | null;
          onboarding_completed?: boolean;
        },
        {
          earnings_mode?: "daily" | "shift";
          ruc?: string | null;
          onboarding_completed?: boolean;
        }
      >;
      user_platforms: Table<
        UserPlatform,
        { id?: string; user_id: string; name: string; active?: boolean },
        { name?: string; active?: boolean }
      >;
      vehicles: Table<
        Vehicle,
        { user_id: string; name: string; odometer_km?: number | null },
        { name?: string; odometer_km?: number | null }
      >;
      work_shifts: Table<
        WorkShift,
        {
          id?: string;
          user_id: string;
          platform_id: string;
          started_at?: string;
          ended_at?: string | null;
          status?: WorkShiftStatus;
          odometer_start?: number | null;
          odometer_end?: number | null;
          opening_cash?: number;
          cash_counted?: string | null;
          cash_counted_at?: string | null;
        },
        {
          started_at?: string;
          ended_at?: string | null;
          status?: WorkShiftStatus;
          odometer_start?: number | null;
          odometer_end?: number | null;
          opening_cash?: number;
          cash_counted?: string | null;
          cash_counted_at?: string | null;
        }
      >;
      shift_pauses: Table<
        ShiftPause,
        {
          id?: string;
          user_id: string;
          shift_id: string;
          started_at?: string;
          ended_at?: string | null;
          odometer_pause?: number | null;
          odometer_resume?: number | null;
        },
        {
          ended_at?: string | null;
          odometer_pause?: number | null;
          odometer_resume?: number | null;
        }
      >;
      earnings: Table<Earning, never, never>;
      earnings_history: Table<EarningsHistory, never, never>;
      expense_categories: Table<
        ExpenseCategory,
        {
          id?: string;
          user_id: string;
          name: string;
          kind: ExpenseCategoryKind;
          active?: boolean;
        },
        { name?: string; kind?: ExpenseCategoryKind; active?: boolean }
      >;
      recurring_expenses: Table<
        RecurringExpense,
        {
          id?: string;
          user_id: string;
          category_id: string;
          description: string;
          amount: string;
          cadence: ExpenseCadence;
          anchor_date: string;
          active?: boolean;
        },
        {
          category_id?: string;
          description?: string;
          amount?: string;
          cadence?: ExpenseCadence;
          anchor_date?: string;
          active?: boolean;
        }
      >;
      expenses: Table<
        Expense,
        {
          id?: string;
          user_id: string;
          category_id: string;
          occurred_at: string;
          amount: string;
          description: string;
          notes?: string | null;
          paid_with_ruc?: boolean;
          shift_id?: string | null;
          payment_method?: PaymentMethod | null;
          cash_paid?: string | null;
          recurring_rule_id?: string | null;
          due_date?: string | null;
        },
        {
          category_id?: string;
          occurred_at?: string;
          amount?: string;
          description?: string;
          notes?: string | null;
          paid_with_ruc?: boolean;
          shift_id?: string | null;
          payment_method?: PaymentMethod | null;
          cash_paid?: string | null;
        }
      >;
      fuel_refills: Table<
        FuelRefill,
        {
          id?: string;
          user_id: string;
          occurred_at: string;
          amount: string;
          liters?: string | null;
          odometer_km?: string | null;
          full_tank?: boolean;
          shift_id?: string | null;
          payment_method?: PaymentMethod | null;
          cash_paid?: string | null;
          notes?: string | null;
        },
        {
          occurred_at?: string;
          amount?: string;
          liters?: string | null;
          odometer_km?: string | null;
          full_tank?: boolean;
          shift_id?: string | null;
          payment_method?: PaymentMethod | null;
          cash_paid?: string | null;
          notes?: string | null;
        }
      >;
      payment_receipts: Table<
        PaymentReceipt,
        {
          user_id: string;
          shift_id?: string | null;
          platform_id: string;
          occurred_at?: string;
          amount: string;
          payment_method: PaymentMethod;
          cash_received?: string | null;
          description?: string | null;
        },
        {
          shift_id?: string | null;
          platform_id?: string;
          amount?: string;
          payment_method?: PaymentMethod;
          cash_received?: string | null;
          description?: string | null;
        }
      >;
      goals: Table<
        Goal,
        { user_id: string; weekly_income: string },
        { weekly_income?: string }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      get_shift_cash_balance: {
        Args: { p_shift_id: string };
        Returns: number | null;
      };
      delete_own_account: { Args: Record<string, never>; Returns: undefined };
      start_work_shift: {
        Args: {
          p_platform_id: string;
          p_odometer_start: number | null;
          p_opening_cash: number;
        };
        Returns: WorkShift;
      };
      transition_work_shift: {
        Args: {
          p_shift_id: string;
          p_action: string;
          p_odometer_end: number | null;
        };
        Returns: WorkShift;
      };
      upsert_earning: {
        Args: {
          p_earning_id: string | null;
          p_platform_id: string;
          p_date: string;
          p_mode: EarningsMode;
          p_shift_id: string | null;
          p_reported_amount: string;
          p_tips: string;
          p_bonuses: string;
          p_tips_included: boolean;
          p_bonuses_included: boolean;
          p_orders: number | null;
          p_notes: string;
          p_expected_revision: number | null;
        };
        Returns: Earning;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
