// Hand-written to mirror `supabase gen types typescript`.
// Regenerate with: supabase gen types typescript --project-id <id> > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string;
          club_id: string;
          title: string;
          author: string | null;
          suggested_by_user_id: string | null;
          suggested_by_name: string | null;
          read: boolean;
          added_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          title: string;
          author?: string | null;
          suggested_by_user_id?: string | null;
          suggested_by_name?: string | null;
          read?: boolean;
          added_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          title?: string;
          author?: string | null;
          suggested_by_user_id?: string | null;
          suggested_by_name?: string | null;
          read?: boolean;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_suggested_by_user_id_fkey";
            columns: ["suggested_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      current_reading: {
        Row: {
          club_id: string;
          book_id: string;
          meeting_date: string | null;
          updated_at: string;
        };
        Insert: {
          club_id: string;
          book_id: string;
          meeting_date?: string | null;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          book_id?: string;
          meeting_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "current_reading_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
