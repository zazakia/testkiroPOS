import { PageHeader } from '@/components/shared/page-header';

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track inventory batches with average costing"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory' },
        ]}
      />

      <div className="text-muted-foreground">
        Inventory management coming soon...
      </div>
    </div>
  );
}
