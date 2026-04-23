"use client";

import { WhopIframeSdkProvider } from "@whop/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WhopIframeSdkProvider>
      <div className="min-h-screen bg-[#0A0A0A] text-[#F0EDE8]">
        {children}
      </div>
    </WhopIframeSdkProvider>
  );
}
