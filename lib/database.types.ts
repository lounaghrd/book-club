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
          note: string | null;
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
          note?: string | null;
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
          note?: string | null;
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
      read_before: {
        Row: {
          id: string;
          club_id: string;
          book_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          book_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          book_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "read_before_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "read_before_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      voting_sessions: {
        Row: {
          id: string;
          club_id: string;
          status: "proposing" | "voting" | "closed" | "done";
          opened_at: string;
          closed_at: string | null;
          winner_book_id: string | null;
        };
        Insert: {
          id?: string;
          club_id: string;
          status?: "proposing" | "voting" | "closed" | "done";
          opened_at?: string;
          closed_at?: string | null;
          winner_book_id?: string | null;
        };
        Update: {
          id?: string;
          club_id?: string;
          status?: "proposing" | "voting" | "closed" | "done";
          opened_at?: string;
          closed_at?: string | null;
          winner_book_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "voting_sessions_winner_book_id_fkey";
            columns: ["winner_book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      nominations: {
        Row: {
          id: string;
          club_id: string;
          session_id: string;
          book_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          session_id: string;
          book_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          session_id?: string;
          book_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nominations_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "voting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nominations_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nominations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      nomination_votes: {
        Row: {
          id: string;
          club_id: string;
          session_id: string;
          nomination_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          session_id: string;
          nomination_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          session_id?: string;
          nomination_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nomination_votes_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "voting_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nomination_votes_nomination_id_fkey";
            columns: ["nomination_id"];
            isOneToOne: false;
            referencedRelation: "nominations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nomination_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
