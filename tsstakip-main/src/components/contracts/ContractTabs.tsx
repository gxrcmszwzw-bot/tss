import Link from "next/link";

const tabs = [
  ["general", "Genel"],
  ["products", "Urunler ve Malzemeler"],
  ["installation", "Kurulum"],
  ["services", "Servis ve Destek"],
  ["iot", "IoT Operasyon"],
  ["timeline", "Zaman Cizgisi"],
] as const;

export function ContractTabs({
  contractId,
  activeTab,
}: {
  contractId: string;
  activeTab: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map(([value, label]) => {
        const isActive = activeTab === value;
        return (
          <Link
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-accent text-white"
                : "border border-border bg-background text-foreground/70 hover:border-accent/40 hover:text-accent"
            }`}
            href={`/admin/contracts/${contractId}?tab=${value}`}
            key={value}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
