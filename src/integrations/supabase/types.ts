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
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          ip: string | null
          method: string
          request: Json | null
          response: Json | null
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          ip?: string | null
          method: string
          request?: Json | null
          response?: Json | null
          status: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string | null
          method?: string
          request?: Json | null
          response?: Json | null
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_name: string
          id: number
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          telegram_enabled: boolean
          telegram_group_bot_token: string | null
          telegram_group_chat_id: string | null
          updated_at: string
        }
        Insert: {
          app_name?: string
          id?: number
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_group_bot_token?: string | null
          telegram_group_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          app_name?: string
          id?: number
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          telegram_enabled?: boolean
          telegram_group_bot_token?: string | null
          telegram_group_chat_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          active: boolean
          bank_name: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          active?: boolean
          bank_name: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          active?: boolean
          bank_name?: string
          created_at?: string
          id?: string
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
      custom_role_permissions: {
        Row: {
          action: string
          allowed: boolean
          custom_role_id: string
          module: string
        }
        Insert: {
          action: string
          allowed?: boolean
          custom_role_id: string
          module: string
        }
        Update: {
          action?: string
          allowed?: boolean
          custom_role_id?: string
          module?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_role_permissions_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          code: string
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          code?: string
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          category: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      pending_customer_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          customer_id: string
          id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          proof_path: string | null
          reject_reason: string | null
          status: string
          submitter_name: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_path?: string | null
          reject_reason?: string | null
          status?: string
          submitter_name?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          proof_path?: string | null
          reject_reason?: string | null
          status?: string
          submitter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_customer_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_employee_bonus: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note: string | null
          product_id: string
          qty: number
          status: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          product_id: string
          qty: number
          status?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          status?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_employee_bonus_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_employee_bonus_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_employee_bonus_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
          custom_role_id: string | null
          employee_id: string | null
          full_name: string | null
          id: string
          is_master: boolean
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          employee_id?: string | null
          full_name?: string | null
          id: string
          is_master?: boolean
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          employee_id?: string | null
          full_name?: string | null
          id?: string
          is_master?: boolean
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          employee_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          supplier_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          supplier_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
      supplier_returns: {
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
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
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
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      telegram_recipients: {
        Row: {
          can_price: boolean
          chat_id: string
          created_at: string
          id: string
          label: string
          notify_enabled: boolean
          updated_at: string
        }
        Insert: {
          can_price?: boolean
          chat_id: string
          created_at?: string
          id?: string
          label: string
          notify_enabled?: boolean
          updated_at?: string
        }
        Update: {
          can_price?: boolean
          chat_id?: string
          created_at?: string
          id?: string
          label?: string
          notify_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      telegram_templates: {
        Row: {
          enabled: boolean
          key: string
          label: string
          module: string
          template: string
          updated_at: string
          variables: string[]
        }
        Insert: {
          enabled?: boolean
          key: string
          label: string
          module: string
          template: string
          updated_at?: string
          variables?: string[]
        }
        Update: {
          enabled?: boolean
          key?: string
          label?: string
          module?: string
          template?: string
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      telegram_webhook_logs: {
        Row: {
          chat_id: string | null
          detail: string | null
          from_id: string | null
          from_name: string | null
          id: number
          raw: Json | null
          received_at: string
          reply_to_text: string | null
          status: string
          text: string | null
        }
        Insert: {
          chat_id?: string | null
          detail?: string | null
          from_id?: string | null
          from_name?: string | null
          id?: number
          raw?: Json | null
          received_at?: string
          reply_to_text?: string | null
          status: string
          text?: string | null
        }
        Update: {
          chat_id?: string | null
          detail?: string | null
          from_id?: string | null
          from_name?: string | null
          id?: number
          raw?: Json | null
          received_at?: string
          reply_to_text?: string | null
          status?: string
          text?: string | null
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
      api_record_customer_payment: {
        Args: {
          _actor: string
          _amount: number
          _customer: string
          _note: string
        }
        Returns: string
      }
      api_record_expense: {
        Args: {
          _actor: string
          _amount: number
          _category: string
          _note: string
        }
        Returns: string
      }
      api_record_salary_advance: {
        Args: {
          _actor: string
          _amount: number
          _employee: string
          _note: string
        }
        Returns: string
      }
      api_record_salary_payment: {
        Args: {
          _actor: string
          _amount: number
          _employee: string
          _note: string
        }
        Returns: string
      }
      api_record_sale: {
        Args: {
          _actor: string
          _customer: string
          _note: string
          _product: string
          _qty: number
          _unit_price: number
          _warehouse: string
        }
        Returns: string
      }
      api_record_stock_in: {
        Args: {
          _actor: string
          _note: string
          _product: string
          _qty: number
          _supplier: string
          _unit_price: number
          _warehouse: string
        }
        Returns: string
      }
      api_record_supplier_payment: {
        Args: {
          _actor: string
          _amount: number
          _note: string
          _supplier: string
        }
        Returns: string
      }
      approve_pending_customer_payment: {
        Args: { p_id: string }
        Returns: string
      }
      approve_pending_customer_payment_via_telegram: {
        Args: { p_id: string }
        Returns: string
      }
      approve_pending_employee_bonus: {
        Args: { p_id: string }
        Returns: string
      }
      approve_pending_employee_bonus_via_telegram: {
        Args: { p_id: string }
        Returns: string
      }
      approve_pending_stock_in: {
        Args: { p_buy_price: number; p_id: string; p_sell_price: number }
        Returns: string
      }
      approve_pending_stock_in_via_telegram: {
        Args: { p_buy_price: number; p_id: string; p_sell_price: number }
        Returns: string
      }
      assert_admin: { Args: never; Returns: undefined }
      assert_permission: {
        Args: { _action: string; _module: string }
        Returns: undefined
      }
      current_warehouse_id: { Args: never; Returns: string }
      factory_reset: { Args: never; Returns: undefined }
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
      record_supplier_return: {
        Args: {
          p_note: string
          p_product_id: string
          p_qty: number
          p_supplier_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      reject_pending_customer_payment: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      reject_pending_employee_bonus: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
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
      submit_pending_employee_bonus: {
        Args: {
          p_employee_id: string
          p_note: string
          p_product_id: string
          p_qty: number
          p_warehouse_id: string
        }
        Returns: string
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
      void_transaction: {
        Args: { p_id: string; p_reason: string; p_table: string }
        Returns: undefined
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
      employee_category:
        | "gudang"
        | "kurir"
        | "kasir"
        | "staff_keuangan"
        | "manager"
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
      employee_category: [
        "gudang",
        "kurir",
        "kasir",
        "staff_keuangan",
        "manager",
      ],
    },
  },
} as const
