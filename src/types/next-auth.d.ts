import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    role: "master_admin" | "manager";
    organizationId: string;
    organizationName: string;
    phone?: string | null;
  }

  interface Session {
    user: User & {
      id: string;
      role: "master_admin" | "manager";
      organizationId: string;
      organizationName: string;
      phone?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name?: string | null;
    role: "master_admin" | "manager";
    organizationId: string;
    organizationName: string;
    phone?: string | null;
  }
}
