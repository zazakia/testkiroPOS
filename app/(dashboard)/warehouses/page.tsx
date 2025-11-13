import { PageHeader } from '@/components/shared/page-header';

export default function WarehousesPage() {
  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage warehouse locations and capacity"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Warehouses' },
        ]}
      />

      <div className="text-muted-foreground">
        Warehouse management coming soon...
      </div>
    </div>
  );
}
