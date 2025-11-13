import { PageHeader } from '@/components/shared/page-header';

export default function SalesOrdersPage() {
  return (
    <div>
      <PageHeader
        title="Sales Orders"
        description="Manage customer orders"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sales Orders' },
        ]}
      />

      <div className="text-muted-foreground">
        Sales order management coming soon...
      </div>
    </div>
  );
}
