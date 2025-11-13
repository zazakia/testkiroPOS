import { PageHeader } from '@/components/shared/page-header';

export default function BranchesPage() {
  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage multiple business locations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Branches' },
        ]}
      />

      <div className="text-muted-foreground">
        Branch management coming soon...
      </div>
    </div>
  );
}
