export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number | null;
  image_path: string | null;
  featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type OrderStatus =
  | "received"
  | "reviewing"
  | "quoted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OrderEmailStatus = "sent" | "not_configured" | "failed";

export type OrderAttachment = {
  path: string;
  name: string;
  type: string;
  size: number;
};

export type Order = {
  id: string;
  customer_name: string;
  contact: string;
  details: string;
  attachments: OrderAttachment[];
  status: OrderStatus;
  created_at: string;
  updated_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Product, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      orders: {
        Row: Omit<Order, "attachments"> & { attachments: Json };
        Insert: Omit<Order, "created_at" | "updated_at" | "attachments"> & {
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Order, "id" | "created_at" | "updated_at" | "attachments">> & {
          attachments?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
