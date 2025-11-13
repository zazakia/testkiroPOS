import { PageHeader } from '@/components/shared/page-header';

export default function PurchaseOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Manage procurement workflow"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Purchase Orders' },
        ]}
      />

      <div className="text-muted-foreground">
        Purchase order management coming soon...
      </div>
    </div>
  );
}
