import { ManagerShell } from "@/components/layout/manager-shell";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ManagerShell>{children}</ManagerShell>;
}
