'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SalesOrderWithItems } from '@/types/sales-order.types';
import { toast } from '@/hooks/use-toast';

interface POSPendingOrdersProps {
  branchId?: string;
  onConvertOrder: (order: SalesOrderWithItems) => void;
}

export function POSPendingOrders({ branchId, onConvertOrder }: POSPendingOrdersProps) {
  const [orders, setOrders] = useState<SalesOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
  }, [branchId]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const url = branchId
        ? `/api/pos/pending-orders?branchId=${branchId}`
        : '/api/pos/pending-orders';
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch pending orders',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = (order: SalesOrderWithItems) => {
    onConvertOrder(order);
    setIsOpen(false);
    toast({
      title: 'Order Loaded',
      description: `Sales order ${order.orderNumber} loaded into cart`,
    });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading || orders.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <CardTitle className="text-base">
                  Pending Orders
                  <Badge variant="secondary" className="ml-2">
                    {orders.length}
                  </Badge>
                </CardTitle>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">{order.orderNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.customerPhone}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold text-primary">
                      ₱{Number(order.totalAmount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(order.deliveryDate)}
                    </div>
                  </div>
                </div>

                {/* Items Count */}
                <div className="text-xs text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </div>

                {/* Convert Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleConvert(order)}
                >
                  Convert to POS
                </Button>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
