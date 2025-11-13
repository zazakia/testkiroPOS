import { PageHeader } from '@/components/shared/page-header';

export default function SuppliersPage() {
  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage supplier relationships and contacts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Suppliers' },
        ]}
      />

      <div className="text-muted-foreground">
        Supplier management coming soon...
      </div>
    </div>
  );
}
