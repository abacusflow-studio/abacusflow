"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TenantPermissionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/platform/permissions");
  }, [router]);
  return null;
}
