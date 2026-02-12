export interface Database {
  public: {
    Tables: {
      portal_domains: {
        Row: PortalDomain;
        Insert: Omit<PortalDomain, "created_at" | "updated_at">;
        Update: Partial<PortalDomain>;
      };
      portal_categories: {
        Row: PortalCategory;
        Insert: Omit<PortalCategory, "id" | "created_at">;
        Update: Partial<PortalCategory>;
      };
      portal_resources: {
        Row: PortalResource;
        Insert: Omit<PortalResource, "id" | "created_at" | "updated_at">;
        Update: Partial<PortalResource>;
      };
    };
  };
}

export interface PortalDomain {
  domain: string;
  display_name: string | null;
  logo_url: string | null;
  tagline: string | null;
  base_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalCategory {
  id: string;
  domain: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface PortalResource {
  id: string;
  domain: string;
  resource_type: "dashboard" | "workflow" | "workspace";
  resource_id: number;
  resource_name: string | null;

  category_id: string | null;
  subcategory: string | null;
  display_name: string | null;
  description: string | null;
  icon: string | null;

  visibility: "client" | "internal";
  featured: boolean;
  status: "active" | "new" | "maintenance";
  sort_order: number;

  created_at: string;
  updated_at: string;
}
