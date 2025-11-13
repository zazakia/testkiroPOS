'use client';

import { Printer, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { POSSaleWithItems } from '@/types/pos.types';

interface POSReceiptProps {
  sale: POSSaleWithItems;
  open: boolean;
  onClose: () => void;
}

export function POSReceipt({ sale, open, onClose }: POSReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        {/* Receipt Content */}
        <div id="receipt-content" className="space-y-4 p-4 bg-white text-black">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold">InventoryPro</h2>
            <p className="text-sm text-muted-foreground">Soft Drinks Wholesale</p>
            <p className="text-xs text-muted-foreground">
              {sale.branch?.location || 'Main Branch'}
            </p>
          </div>

          <Separator />

          {/* Receipt Info */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt No:</span>
              <span className="font-mono font-semibold">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{formatDate(sale.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment:</span>
              <span className="capitalize">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qty</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground">{item.uom}</div>
                      </div>
                    </td>
                    <td className="text-center">{Number(item.quantity)}</td>
                    <td className="text-right">₱{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="text-right font-medium">
                      ₱{Number(item.subtotal).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>₱{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (12%):</span>
              <span>₱{Number(sale.tax).toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>₱{Number(sale.totalAmount).toFixed(2)}</span>
            </div>

            {/* Cash Payment Details */}
            {sale.paymentMethod === 'cash' && sale.amountReceived && (
              <>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Received:</span>
                  <span>₱{Number(sale.amountReceived).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Change:</span>
                  <span>₱{Number(sale.change || 0).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Thank you for your purchase!</p>
            <p>Please come again</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
          <Button onClick={onClose} className="flex-1">
            New Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
