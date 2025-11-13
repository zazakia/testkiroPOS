import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog with multiple units of measure"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Products' },
        ]}
        actions={
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        }
      />

      <div className="text-muted-foreground">
        Product management coming soon...
      </div>
    </div>
  );
}
