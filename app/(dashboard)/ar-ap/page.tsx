'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAR } from '@/hooks/use-ar';
import { useAP } from '@/hooks/use-ap';
import { useBranch } from '@/hooks/use-branch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function ARAPPage() {
  const { selectedBranch } = useBranch();
  const { records: arRecords, loading: arLoading } = useAR({ branchId: selectedBranch?.id });
  const { records: apRecords, loading: apLoading } = useAP({ branchId: selectedBranch?.id });

  const handleRecordPayment = (id: string, type: 'ar' | 'ap') => {
    // TODO: Open payment dialog/modal
    toast.info(`Record payment feature for ${type.toUpperCase()} ID: ${id} - Coming soon`);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      partial: 'default',
      paid: 'default',
      overdue: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getAgingColor = (dueDate: Date | string, status: string) => {
    if (status === 'paid') return 'text-green-600';
    
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue <= 30) return 'text-green-600';
    if (daysOverdue <= 60) return 'text-yellow-600';
    if (daysOverdue <= 90) return 'text-orange-600';
    return 'text-red-600';
  };
  return (
    <div className="p-6">
      <PageHeader
        title="Accounts Receivable / Payable"
        description="Manage accounts receivable and payable"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AR/AP' },
        ]}
      />

      <Tabs defaultValue="ar" className="mt-6">
        <TabsList>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
        </TabsList>

        <TabsContent value="ar" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {arLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : arRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts receivable records found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.customerName}</TableCell>
                        <TableCell>{formatCurrency(Number(record.totalAmount))}</TableCell>
                        <TableCell>{formatCurrency(Number(record.paidAmount))}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(Number(record.balance))}</TableCell>
                        <TableCell className={getAgingColor(record.dueDate, record.status)}>
                          {formatDate(record.dueDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.status !== 'paid' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRecordPayment(record.id, 'ar')}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ap" className="mt-6">
          <Card>
            <CardContent className="p-6">
              {apLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : apRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts payable records found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.supplier.companyName}</TableCell>
                        <TableCell>{formatCurrency(Number(record.totalAmount))}</TableCell>
                        <TableCell>{formatCurrency(Number(record.paidAmount))}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(Number(record.balance))}</TableCell>
                        <TableCell className={getAgingColor(record.dueDate, record.status)}>
                          {formatDate(record.dueDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>
                          {record.status !== 'paid' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRecordPayment(record.id, 'ap')}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
