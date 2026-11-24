// ARQUIVO GERADO por scripts/gen-db-types.py — não edite à mão.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      appointment_events: {
        Row: {
          id: number;
          barbershop_id: string;
          appointment_id: string;
          kind: string;
          from_status: Database["public"]["Enums"]["appointment_status"] | null;
          to_status: Database["public"]["Enums"]["appointment_status"] | null;
          details: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          barbershop_id: string;
          appointment_id: string;
          kind: string;
          from_status?: Database["public"]["Enums"]["appointment_status"] | null;
          to_status?: Database["public"]["Enums"]["appointment_status"] | null;
          details?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          barbershop_id?: string;
          appointment_id?: string;
          kind?: string;
          from_status?: Database["public"]["Enums"]["appointment_status"] | null;
          to_status?: Database["public"]["Enums"]["appointment_status"] | null;
          details?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_events_barbershop_id_appointment_id_fkey";
            columns: ["barbershop_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          barbershop_id: string;
          professional_id: string;
          service_id: string;
          customer_id: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: number;
          price_cents: number;
          status: Database["public"]["Enums"]["appointment_status"];
          source: Database["public"]["Enums"]["appointment_source"];
          notes: string | null;
          cancel_reason: string | null;
          status_changed_at: string;
          created_by: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
          public_token: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          professional_id: string;
          service_id: string;
          customer_id: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: number;
          price_cents: number;
          status?: Database["public"]["Enums"]["appointment_status"];
          source?: Database["public"]["Enums"]["appointment_source"];
          notes?: string | null;
          cancel_reason?: string | null;
          status_changed_at?: string;
          created_by?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
          public_token?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          professional_id?: string;
          service_id?: string;
          customer_id?: string;
          starts_at?: string;
          ends_at?: string;
          duration_minutes?: number;
          price_cents?: number;
          status?: Database["public"]["Enums"]["appointment_status"];
          source?: Database["public"]["Enums"]["appointment_source"];
          notes?: string | null;
          cancel_reason?: string | null;
          status_changed_at?: string;
          created_by?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
          public_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_barbershop_id_customer_id_fkey";
            columns: ["barbershop_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "appointments_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_barbershop_id_professional_id_fkey";
            columns: ["barbershop_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "appointments_barbershop_id_service_id_fkey";
            columns: ["barbershop_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          actor_role: string | null;
          barbershop_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_id?: string | null;
          actor_role?: string | null;
          barbershop_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          actor_id?: string | null;
          actor_role?: string | null;
          barbershop_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershop_members: {
        Row: {
          id: string;
          barbershop_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["shop_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["shop_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["shop_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barbershop_members_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          status: Database["public"]["Enums"]["barbershop_status"];
          timezone: string;
          phone: string | null;
          whatsapp: string | null;
          email: string | null;
          address_street: string | null;
          address_number: string | null;
          address_complement: string | null;
          address_district: string | null;
          address_city: string | null;
          address_state: string | null;
          address_zip: string | null;
          social_links: Json;
          logo_url: string | null;
          cover_url: string | null;
          branding: Json;
          published_at: string | null;
          min_advance_minutes: number;
          max_advance_days: number;
          buffer_minutes: number;
          slot_interval_minutes: number;
          cancellation_min_hours: number;
          cancellation_policy: string | null;
          auto_confirm: boolean;
          onboarding_step: number;
          onboarding_completed_at: string | null;
          is_demo: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          notification_prefs: Json;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["barbershop_status"];
          timezone?: string;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_district?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          social_links?: Json;
          logo_url?: string | null;
          cover_url?: string | null;
          branding?: Json;
          published_at?: string | null;
          min_advance_minutes?: number;
          max_advance_days?: number;
          buffer_minutes?: number;
          slot_interval_minutes?: number;
          cancellation_min_hours?: number;
          cancellation_policy?: string | null;
          auto_confirm?: boolean;
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          is_demo?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          notification_prefs?: Json;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["barbershop_status"];
          timezone?: string;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          address_street?: string | null;
          address_number?: string | null;
          address_complement?: string | null;
          address_district?: string | null;
          address_city?: string | null;
          address_state?: string | null;
          address_zip?: string | null;
          social_links?: Json;
          logo_url?: string | null;
          cover_url?: string | null;
          branding?: Json;
          published_at?: string | null;
          min_advance_minutes?: number;
          max_advance_days?: number;
          buffer_minutes?: number;
          slot_interval_minutes?: number;
          cancellation_min_hours?: number;
          cancellation_policy?: string | null;
          auto_confirm?: boolean;
          onboarding_step?: number;
          onboarding_completed_at?: string | null;
          is_demo?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          notification_prefs?: Json;
        };
        Relationships: [];
      };
      coupon_redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          barbershop_id: string;
          subscription_id: string | null;
          discount_cents: number;
          redeemed_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          barbershop_id: string;
          subscription_id?: string | null;
          discount_cents?: number;
          redeemed_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          barbershop_id?: string;
          subscription_id?: string | null;
          discount_cents?: number;
          redeemed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          name: string;
          code: string;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          extra_trial_days: number;
          starts_at: string | null;
          ends_at: string | null;
          max_redemptions: number | null;
          audience: Database["public"]["Enums"]["coupon_audience"];
          applicable_plan_ids: string[];
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          discount_type: Database["public"]["Enums"]["discount_type"];
          discount_value: number;
          extra_trial_days?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          max_redemptions?: number | null;
          audience?: Database["public"]["Enums"]["coupon_audience"];
          applicable_plan_ids?: string[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          discount_type?: Database["public"]["Enums"]["discount_type"];
          discount_value?: number;
          extra_trial_days?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          max_redemptions?: number | null;
          audience?: Database["public"]["Enums"]["coupon_audience"];
          applicable_plan_ids?: string[];
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          phone: string;
          email: string | null;
          notes: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          name: string;
          phone: string;
          email?: string | null;
          notes?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          notes?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          barbershop_id: string | null;
          user_id: string | null;
          channel: Database["public"]["Enums"]["notification_channel"];
          event_type: string;
          title: string;
          body: string | null;
          payload: Json;
          status: Database["public"]["Enums"]["notification_status"];
          error: string | null;
          read_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id?: string | null;
          user_id?: string | null;
          channel?: Database["public"]["Enums"]["notification_channel"];
          event_type: string;
          title: string;
          body?: string | null;
          payload?: Json;
          status?: Database["public"]["Enums"]["notification_status"];
          error?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string | null;
          user_id?: string | null;
          channel?: Database["public"]["Enums"]["notification_channel"];
          event_type?: string;
          title?: string;
          body?: string | null;
          payload?: Json;
          status?: Database["public"]["Enums"]["notification_status"];
          error?: string | null;
          read_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_gateways: {
        Row: {
          id: string;
          provider: Database["public"]["Enums"]["payment_gateway"];
          environment: Database["public"]["Enums"]["gateway_environment"];
          is_active: boolean;
          public_key: string | null;
          secret_key_vault_id: string | null;
          webhook_secret_vault_id: string | null;
          enabled_methods: string[];
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: Database["public"]["Enums"]["payment_gateway"];
          environment?: Database["public"]["Enums"]["gateway_environment"];
          is_active?: boolean;
          public_key?: string | null;
          secret_key_vault_id?: string | null;
          webhook_secret_vault_id?: string | null;
          enabled_methods?: string[];
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: Database["public"]["Enums"]["payment_gateway"];
          environment?: Database["public"]["Enums"]["gateway_environment"];
          is_active?: boolean;
          public_key?: string | null;
          secret_key_vault_id?: string | null;
          webhook_secret_vault_id?: string | null;
          enabled_methods?: string[];
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          barbershop_id: string;
          subscription_id: string | null;
          plan_id: string | null;
          gateway: Database["public"]["Enums"]["payment_gateway"];
          environment: Database["public"]["Enums"]["gateway_environment"];
          gateway_payment_id: string | null;
          amount_cents: number;
          discount_cents: number;
          method: string | null;
          status: Database["public"]["Enums"]["transaction_status"];
          paid_at: string | null;
          raw_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          subscription_id?: string | null;
          plan_id?: string | null;
          gateway: Database["public"]["Enums"]["payment_gateway"];
          environment: Database["public"]["Enums"]["gateway_environment"];
          gateway_payment_id?: string | null;
          amount_cents: number;
          discount_cents?: number;
          method?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          paid_at?: string | null;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          subscription_id?: string | null;
          plan_id?: string | null;
          gateway?: Database["public"]["Enums"]["payment_gateway"];
          environment?: Database["public"]["Enums"]["gateway_environment"];
          gateway_payment_id?: string | null;
          amount_cents?: number;
          discount_cents?: number;
          method?: string | null;
          status?: Database["public"]["Enums"]["transaction_status"];
          paid_at?: string | null;
          raw_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_transactions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          barbershop_id: string;
          appointment_id: string | null;
          service_id: string | null;
          professional_id: string | null;
          customer_id: string | null;
          amount_cents: number;
          method: Database["public"]["Enums"]["payment_method"];
          status: Database["public"]["Enums"]["payment_status"];
          paid_at: string;
          notes: string | null;
          recorded_by: string | null;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          appointment_id?: string | null;
          service_id?: string | null;
          professional_id?: string | null;
          customer_id?: string | null;
          amount_cents: number;
          method: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string;
          notes?: string | null;
          recorded_by?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          appointment_id?: string | null;
          service_id?: string | null;
          professional_id?: string | null;
          customer_id?: string | null;
          amount_cents?: number;
          method?: Database["public"]["Enums"]["payment_method"];
          status?: Database["public"]["Enums"]["payment_status"];
          paid_at?: string;
          notes?: string | null;
          recorded_by?: string | null;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_barbershop_id_appointment_id_fkey";
            columns: ["barbershop_id", "appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "payments_barbershop_id_customer_id_fkey";
            columns: ["barbershop_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "payments_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_barbershop_id_professional_id_fkey";
            columns: ["barbershop_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "payments_barbershop_id_service_id_fkey";
            columns: ["barbershop_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
      plan_features: {
        Row: {
          plan_id: string;
          feature_key: string;
          enabled: boolean;
          limit_value: number | null;
          label: string | null;
          sort_order: number;
        };
        Insert: {
          plan_id: string;
          feature_key: string;
          enabled?: boolean;
          limit_value?: number | null;
          label?: string | null;
          sort_order?: number;
        };
        Update: {
          plan_id?: string;
          feature_key?: string;
          enabled?: boolean;
          limit_value?: number | null;
          label?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price_cents: number;
          compare_at_cents: number | null;
          billing_period: Database["public"]["Enums"]["billing_period"];
          trial_days: number;
          is_featured: boolean;
          highlight_label: string | null;
          is_active: boolean;
          is_default_trial: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price_cents: number;
          compare_at_cents?: number | null;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          trial_days?: number;
          is_featured?: boolean;
          highlight_label?: string | null;
          is_active?: boolean;
          is_default_trial?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price_cents?: number;
          compare_at_cents?: number | null;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          trial_days?: number;
          is_featured?: boolean;
          highlight_label?: string | null;
          is_active?: boolean;
          is_default_trial?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: boolean;
          platform_name: string;
          logo_url: string | null;
          favicon_url: string | null;
          support_email: string | null;
          contact_phone: string | null;
          contact_whatsapp: string | null;
          public_base_url: string;
          default_trial_days: number;
          grace_period_days: number;
          default_gateway: Database["public"]["Enums"]["payment_gateway"] | null;
          notification_settings: Json;
          billing_settings: Json;
          updated_at: string;
          updated_by: string | null;
          social_links: Json;
        };
        Insert: {
          id?: boolean;
          platform_name?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          support_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          public_base_url?: string;
          default_trial_days?: number;
          grace_period_days?: number;
          default_gateway?: Database["public"]["Enums"]["payment_gateway"] | null;
          notification_settings?: Json;
          billing_settings?: Json;
          updated_at?: string;
          updated_by?: string | null;
          social_links?: Json;
        };
        Update: {
          id?: boolean;
          platform_name?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          support_email?: string | null;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          public_base_url?: string;
          default_trial_days?: number;
          grace_period_days?: number;
          default_gateway?: Database["public"]["Enums"]["payment_gateway"] | null;
          notification_settings?: Json;
          billing_settings?: Json;
          updated_at?: string;
          updated_by?: string | null;
          social_links?: Json;
        };
        Relationships: [];
      };
      professional_services: {
        Row: {
          barbershop_id: string;
          professional_id: string;
          service_id: string;
        };
        Insert: {
          barbershop_id: string;
          professional_id: string;
          service_id: string;
        };
        Update: {
          barbershop_id?: string;
          professional_id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_services_barbershop_id_professional_id_fkey";
            columns: ["barbershop_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["barbershop_id", "id"];
          },
          {
            foreignKeyName: "professional_services_barbershop_id_service_id_fkey";
            columns: ["barbershop_id", "service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
      professionals: {
        Row: {
          id: string;
          barbershop_id: string;
          user_id: string | null;
          name: string;
          photo_url: string | null;
          phone: string | null;
          email: string | null;
          specialties: string[];
          bio: string | null;
          is_active: boolean;
          sort_order: number;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          user_id?: string | null;
          name: string;
          photo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          specialties?: string[];
          bio?: string | null;
          is_active?: boolean;
          sort_order?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          user_id?: string | null;
          name?: string;
          photo_url?: string | null;
          phone?: string | null;
          email?: string | null;
          specialties?: string[];
          bio?: string | null;
          is_active?: boolean;
          sort_order?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          platform_role: Database["public"]["Enums"]["platform_role"];
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          platform_role?: Database["public"]["Enums"]["platform_role"];
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          barbershop_id: string;
          name: string;
          description: string | null;
          category: string | null;
          price_cents: number;
          duration_minutes: number;
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          name: string;
          description?: string | null;
          category?: string | null;
          price_cents: number;
          duration_minutes: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          name?: string;
          description?: string | null;
          category?: string | null;
          price_cents?: number;
          duration_minutes?: number;
          image_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_events: {
        Row: {
          id: string;
          subscription_id: string;
          barbershop_id: string;
          event_type: string;
          from_status: Database["public"]["Enums"]["subscription_status"] | null;
          to_status: Database["public"]["Enums"]["subscription_status"] | null;
          metadata: Json;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          barbershop_id: string;
          event_type: string;
          from_status?: Database["public"]["Enums"]["subscription_status"] | null;
          to_status?: Database["public"]["Enums"]["subscription_status"] | null;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          barbershop_id?: string;
          event_type?: string;
          from_status?: Database["public"]["Enums"]["subscription_status"] | null;
          to_status?: Database["public"]["Enums"]["subscription_status"] | null;
          metadata?: Json;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_events_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscription_events_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          barbershop_id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          amount_cents: number;
          billing_period: Database["public"]["Enums"]["billing_period"];
          started_at: string;
          current_period_start: string;
          current_period_end: string;
          next_billing_at: string | null;
          coupon_id: string | null;
          gateway: Database["public"]["Enums"]["payment_gateway"] | null;
          gateway_customer_id: string | null;
          gateway_subscription_id: string | null;
          canceled_at: string | null;
          cancel_at_period_end: boolean;
          suspended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          amount_cents: number;
          billing_period: Database["public"]["Enums"]["billing_period"];
          started_at?: string;
          current_period_start?: string;
          current_period_end: string;
          next_billing_at?: string | null;
          coupon_id?: string | null;
          gateway?: Database["public"]["Enums"]["payment_gateway"] | null;
          gateway_customer_id?: string | null;
          gateway_subscription_id?: string | null;
          canceled_at?: string | null;
          cancel_at_period_end?: boolean;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          plan_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          amount_cents?: number;
          billing_period?: Database["public"]["Enums"]["billing_period"];
          started_at?: string;
          current_period_start?: string;
          current_period_end?: string;
          next_billing_at?: string | null;
          coupon_id?: string | null;
          gateway?: Database["public"]["Enums"]["payment_gateway"] | null;
          gateway_customer_id?: string | null;
          gateway_subscription_id?: string | null;
          canceled_at?: string | null;
          cancel_at_period_end?: boolean;
          suspended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      time_blocks: {
        Row: {
          id: string;
          barbershop_id: string;
          professional_id: string | null;
          kind: Database["public"]["Enums"]["time_block_kind"];
          starts_at: string;
          ends_at: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          professional_id?: string | null;
          kind?: Database["public"]["Enums"]["time_block_kind"];
          starts_at: string;
          ends_at: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          professional_id?: string | null;
          kind?: Database["public"]["Enums"]["time_block_kind"];
          starts_at?: string;
          ends_at?: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "time_blocks_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "time_blocks_barbershop_id_professional_id_fkey";
            columns: ["barbershop_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
      working_hours: {
        Row: {
          id: string;
          barbershop_id: string;
          professional_id: string | null;
          weekday: number;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          barbershop_id: string;
          professional_id?: string | null;
          weekday: number;
          starts_at: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          barbershop_id?: string;
          professional_id?: string | null;
          weekday?: number;
          starts_at?: string;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "working_hours_barbershop_id_fkey";
            columns: ["barbershop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "working_hours_barbershop_id_professional_id_fkey";
            columns: ["barbershop_id", "professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["barbershop_id", "id"];
          },
        ];
      };
    };
    Views: {
      customer_stats: {
        Row: {
          customer_id: string | null;
          barbershop_id: string | null;
          total_appointments: number | null;
          completed_appointments: number | null;
          last_visit_at: string | null;
          total_spent_cents: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      barbershop_access_level: { Args: { p_barbershop_id: string }; Returns: string };
      can_operate: { Args: { p_barbershop_id: string }; Returns: boolean };
      cancel_public_appointment: { Args: { p_token: string; p_reason?: string }; Returns: Json };
      create_public_booking: { Args: { p_slug: string; p_service_id: string; p_professional_id: string; p_starts_at: string; p_name: string; p_phone: string; p_email?: string; p_notes?: string }; Returns: Json };
      dashboard_overview: { Args: { p_barbershop_id: string; p_from: string; p_to: string }; Returns: Json };
      finance_overview: { Args: { p_barbershop_id: string; p_from: string; p_to: string }; Returns: Json };
      get_available_slots: { Args: { p_barbershop_id: string; p_service_id: string; p_day: string; p_professional_id?: string }; Returns: { professional_id: string; starts_at: string; ends_at: string }[] };
      get_public_appointment: { Args: { p_token: string }; Returns: Json };
      get_public_barbershop: { Args: { p_slug: string }; Returns: Json };
      get_public_platform_info: { Args: Record<PropertyKey, never>; Returns: { platform_name: string; logo_url: string; support_email: string; contact_phone: string; contact_whatsapp: string; public_base_url: string; default_trial_days: number; social_links: Json }[] };
      has_feature: { Args: { p_barbershop_id: string; p_feature_key: string }; Returns: boolean };
      has_shop_role: { Args: { shop_id: string; roles: Database["public"]["Enums"]["shop_role"][] }; Returns: boolean };
      is_own_professional: { Args: { p_professional_id: string }; Returns: boolean };
      is_reserved_slug: { Args: { p_slug: string }; Returns: boolean };
      is_shop_manager: { Args: { shop_id: string }; Returns: boolean };
      is_shop_member: { Args: { shop_id: string }; Returns: boolean };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      plan_limit: { Args: { p_barbershop_id: string; p_feature_key: string }; Returns: number };
      shares_shop_with: { Args: { p_user_id: string }; Returns: boolean };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      appointment_source: "manual" | "public_page";
      appointment_status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
      barbershop_status: "active" | "suspended";
      billing_period: "monthly" | "quarterly" | "semiannual" | "annual";
      coupon_audience: "all" | "new_customers" | "existing_customers";
      discount_type: "percent" | "fixed";
      gateway_environment: "sandbox" | "production";
      notification_channel: "in_app" | "email" | "whatsapp";
      notification_status: "pending" | "sent" | "failed" | "skipped_not_configured";
      payment_gateway: "mercado_pago" | "asaas" | "stripe";
      payment_method: "cash" | "pix" | "debit_card" | "credit_card" | "other";
      payment_status: "received" | "refunded";
      platform_role: "user" | "super_admin";
      shop_role: "owner" | "admin" | "professional";
      subscription_status: "trial" | "active" | "pending" | "past_due" | "canceled" | "suspended" | "expired";
      time_block_kind: "block" | "day_off" | "holiday";
      transaction_status: "pending" | "approved" | "refused" | "refunded" | "canceled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
