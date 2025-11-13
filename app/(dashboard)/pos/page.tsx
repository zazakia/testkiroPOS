import { PageHeader } from '@/components/shared/page-header';

export default function POSPage() {
  return (
    <div>
      <PageHeader
        title="Point of Sale"
        description="Process sales transactions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'POS' },
        ]}
      />

      <div className="text-muted-foreground">
        POS system coming soon...
      </div>
    </div>
  );
}
