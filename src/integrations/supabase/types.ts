export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          app_name: string
          id: number
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          telegram_enabled: boolean
          updated_at: string
        }
        Insert: {
          app_name?: string
          id?: number
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          updated_at?: string
        }
        Update: {
          app_name?: string
          id?: number
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cash_balance: {
        Row: {
          amount: number
          id: number
        }
        Insert: {
          amount?: number
          id?: number
        }
        Update: {
          amount?: number
          id?: number
        }
        Relationships: []
      }
      cash_movements: {
        Row: {
          amount: number
          category: string
          created_by: string | null
          description: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          id: string
          occurred_at: string
          ref_id: string | null
          ref_table: string | null
        }
        Insert: {
          amount: number
          category: string
          created_by?: string | null
          description?: string | null
          direction: Database["public"]["Enums"]["cash_direction"]
          id?: string
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_by?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["cash_direction"]
          id?: string
          occurred_at?: string
          ref_id?: string | null
          ref_table?: string | null
        }
        Relationships: []
      }
      customer_balances: {
        Row: {
          customer_id: string
          receivable: number
        }
        Insert: {
          customer_id: string
          receivable?: number
        }
        Update: {
          customer_id?: string
          receivable?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_balances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_by: string | null
          customer_id: string
          id: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      employee_bonuses: {
        Row: {
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          occurred_at: string
          product_id: string
          qty: number
          warehouse_id: string
        }
        Insert: {
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id: string
          qty: number
          warehouse_id: string
        }
        Update: {
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id?: string
          qty?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bonuses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_bonuses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_salary_balances: {
        Row: {
          balance: number
          employee_id: string
        }
        Insert: {
          balance?: number
          employee_id: string
        }
        Update: {
          balance?: number
          employee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_salary_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          category: Database["public"]["Enums"]["employee_category"]
          created_at: string
          id: string
          name: string
          phone: string | null
          warehouse_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["employee_category"]
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          warehouse_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["employee_category"]
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          category: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: []
      }
      pending_stock_in: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          product_id: string
          qty: number
          status: string
          supplier_id: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id: string
          qty: number
          status?: string
          supplier_id: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          status?: string
          supplier_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_stock_in_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_stock_in_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_stock_in_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          buy_price: number
          commission_per_unit: number
          created_at: string
          id: string
          name: string
          sell_price: number
          sku: string | null
        }
        Insert: {
          buy_price?: number
          commission_per_unit?: number
          created_at?: string
          id?: string
          name: string
          sell_price?: number
          sku?: string | null
        }
        Update: {
          buy_price?: number
          commission_per_unit?: number
          created_at?: string
          id?: string
          name?: string
          sell_price?: number
          sku?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_master: boolean
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_master?: boolean
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_master?: boolean
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_warehouse_fk"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_default_permissions: {
        Row: {
          action: string
          allowed: boolean
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          allowed?: boolean
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          allowed?: boolean
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      salary_accruals: {
        Row: {
          amount: number
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          occurred_at: string
          rate: number
          units: number
        }
        Insert: {
          amount: number
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          rate: number
          units: number
        }
        Update: {
          amount?: number
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          rate?: number
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_accruals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          amount: number
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          amount: number
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Update: {
          amount?: number
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_by: string | null
          customer_id: string
          id: string
          note: string | null
          occurred_at: string
          product_id: string
          qty: number
          total: number
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id: string
          qty: number
          total: number
          unit_price: number
          warehouse_id: string
        }
        Update: {
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id?: string
          qty?: number
          total?: number
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_in: {
        Row: {
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
          product_id: string
          qty: number
          supplier_id: string
          total: number
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          product_id: string
          qty: number
          supplier_id: string
          total: number
          unit_price: number
          warehouse_id: string
        }
        Update: {
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          product_id?: string
          qty?: number
          supplier_id?: string
          total?: number
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: string
          product_id: string
          qty: number
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          qty?: number
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          qty?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_mutations: {
        Row: {
          created_by: string | null
          from_warehouse_id: string
          id: string
          note: string | null
          occurred_at: string
          product_id: string
          qty: number
          to_warehouse_id: string
        }
        Insert: {
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id: string
          qty: number
          to_warehouse_id: string
        }
        Update: {
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          product_id?: string
          qty?: number
          to_warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_mutations_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_mutations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_mutations_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_balances: {
        Row: {
          payable: number
          supplier_id: string
        }
        Insert: {
          payable?: number
          supplier_id: string
        }
        Update: {
          payable?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_balances_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
          supplier_id: string
        }
        Insert: {
          amount: number
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          supplier_id: string
        }
        Update: {
          amount?: number
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string
          allowed: boolean
          module: string
          user_id: string
        }
        Insert: {
          action: string
          allowed?: boolean
          module: string
          user_id: string
        }
        Update: {
          action?: string
          allowed?: boolean
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_pending_stock_in: {
        Args: { p_buy_price: number; p_id: string; p_sell_price: number }
        Returns: string
      }
      assert_admin: { Args: never; Returns: undefined }
      assert_permission: {
        Args: { _action: string; _module: string }
        Returns: undefined
      }
      current_warehouse_id: { Args: never; Returns: string }
      get_app_name: { Args: never; Returns: string }
      has_permission: {
        Args: { _action: string; _module: string; _user: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_customer_payment: {
        Args: { p_amount: number; p_customer_id: string; p_note: string }
        Returns: string
      }
      record_employee_bonus: {
        Args: {
          p_employee_id: string
          p_note: string
          p_product_id: string
          p_qty: number
          p_warehouse_id: string
        }
        Returns: string
      }
      record_expense: {
        Args: { p_amount: number; p_category: string; p_note: string }
        Returns: string
      }
      record_mutation: {
        Args: {
          p_from: string
          p_note: string
          p_product_id: string
          p_qty: number
          p_to: string
        }
        Returns: string
      }
      record_salary_accrual: {
        Args: {
          p_employee_id: string
          p_note: string
          p_rate: number
          p_units: number
        }
        Returns: string
      }
      record_salary_advance: {
        Args: { p_amount: number; p_employee_id: string; p_note: string }
        Returns: string
      }
      record_salary_payment: {
        Args: { p_amount: number; p_employee_id: string; p_note: string }
        Returns: string
      }
      record_sale: {
        Args: {
          p_customer_id: string
          p_note: string
          p_product_id: string
          p_qty: number
          p_unit_price: number
          p_warehouse_id: string
        }
        Returns: string
      }
      record_stock_in: {
        Args: {
          p_note: string
          p_product_id: string
          p_qty: number
          p_supplier_id: string
          p_unit_price: number
          p_warehouse_id: string
        }
        Returns: string
      }
      record_supplier_payment: {
        Args: { p_amount: number; p_note: string; p_supplier_id: string }
        Returns: string
      }
      reject_pending_stock_in: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      reset_transactions: { Args: never; Returns: undefined }
      set_initial_cash: { Args: { p_amount: number }; Returns: undefined }
      set_initial_payable: {
        Args: { p_amount: number; p_supplier_id: string }
        Returns: undefined
      }
      set_initial_receivable: {
        Args: { p_amount: number; p_customer_id: string }
        Returns: undefined
      }
      set_initial_salary: {
        Args: { p_amount: number; p_employee_id: string }
        Returns: undefined
      }
      set_initial_stock: {
        Args: { p_product_id: string; p_qty: number; p_warehouse_id: string }
        Returns: undefined
      }
      submit_pending_stock_in: {
        Args: {
          p_note: string
          p_product_id: string
          p_qty: number
          p_supplier_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "staf_gudang"
        | "admin"
        | "kasir"
        | "staff_keuangan"
        | "manager"
        | "viewer"
        | "custom"
      cash_direction: "in" | "out"
      employee_category: "gudang" | "kurir"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "staf_gudang",
        "admin",
        "kasir",
        "staff_keuangan",
        "manager",
        "viewer",
        "custom",
      ],
      cash_direction: ["in", "out"],
      employee_category: ["gudang", "kurir"],
    },
  },
} as const
