import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RevOpsBR Roles — Vagas de Revenue Operations no Brasil",
  description:
    "Vagas curadas de RevOps, Sales Ops, CS Ops, GTM Ops, Marketing Ops e CRM Admin no Brasil. Atualizado diariamente.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
