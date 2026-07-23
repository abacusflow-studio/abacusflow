"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";

/**
 * Compatibility landing route for previously issued token links.
 * The invitation center resolves invitations from the verified login email and
 * lets the user review tenant and roles before accepting or declining.
 */
export default function AcceptInvitationPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "var(--colorBgLayout, #f1f5f9)",
      }}
    >
      <Spin size="large" tip="正在打开邀请中心..." />
    </div>
  );
}
