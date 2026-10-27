"use client";

import CmsLandingEditor from "@/components/CmsLandingEditor";
import type { PapelUsuario } from "@/lib/rbac/roles";

type Props = {
  role?: PapelUsuario | null;
  email?: string;
};

export default function AdminCmsLanding({ role, email }: Props) {
  return <CmsLandingEditor role={role} email={email} />;
}
