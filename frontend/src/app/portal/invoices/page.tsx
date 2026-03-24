'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  DollarSign,
  Calendar,
  FileText,
} from 'lucide-react';
import { portalApi, Invoice } from '@/lib/api';

function formatCurrency(amount: number | undefined | null) {
  if (amount == null) return 'R0.00';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount);
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const data = await portalApi.getInvoices();
      setInvoices(data.invoices);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch invoices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAmount = (inv: any) => {
    return inv.total || inv.subtotal || inv.amount || 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>;
      case 'sent':
      case 'draft':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Unpaid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-slate-400">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'sent':
      case 'draft':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Receipt className="w-5 h-5 text-slate-400" />;
    }
  };

  const unpaidInvoices = invoices.filter(i => ['sent', 'draft', 'overdue'].includes((i as any).status));
  const paidInvoices = invoices.filter(i => (i as any).status === 'paid');

  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + getAmount(inv), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500">View and manage your invoices</p>
      </div>

      {/* Summary Card */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Receipt className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Invoices</p>
                  <p className="text-xl font-bold">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={totalOutstanding > 0 ? 'border-amber-200' : ''}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${totalOutstanding > 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  <DollarSign className={`w-5 h-5 ${totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Outstanding</p>
                  <p className="text-xl font-bold">{formatCurrency(totalOutstanding)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Paid</p>
                  <p className="text-xl font-bold">{paidInvoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No Invoices</h3>
            <p className="text-slate-500 text-sm mt-1">
              Invoices will appear here when they&apos;re generated.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unpaid Invoices */}
          {unpaidInvoices.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Outstanding Invoices</h2>
              <div className="space-y-3">
                {unpaidInvoices.map((invoice: any) => (
                  <Card key={invoice.id} className="border-amber-200 bg-amber-50/20">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(invoice.status)}
                          <div>
                            <h3 className="font-medium text-slate-900">{invoice.invoice_number}</h3>
                            <p className="text-sm text-slate-500">
                              {invoice.project?.name && `${invoice.project.name} · `}
                              Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'on receipt'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">
                              {formatCurrency(getAmount(invoice))}
                            </p>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setViewInvoice(invoice)}
                            variant="outline"
                          >
                            <FileText className="w-4 h-4 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Paid Invoices */}
          {paidInvoices.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment History</h2>
              <div className="space-y-3">
                {paidInvoices.map((invoice: any) => (
                  <Card key={invoice.id}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon('paid')}
                          <div>
                            <h3 className="font-medium text-slate-900">{invoice.invoice_number}</h3>
                            <p className="text-sm text-slate-500">
                              {invoice.project?.name && `${invoice.project.name} · `}
                              Paid {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-xl font-bold text-slate-900">
                            {formatCurrency(getAmount(invoice))}
                          </p>
                          {getStatusBadge('paid')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoice {viewInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              {viewInvoice?.project?.name}
            </DialogDescription>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Status</p>
                  <div className="mt-1">{getStatusBadge(viewInvoice.status)}</div>
                </div>
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="font-bold text-lg">{formatCurrency(getAmount(viewInvoice))}</p>
                </div>
                <div>
                  <p className="text-slate-500">Issue Date</p>
                  <p className="font-medium">
                    {viewInvoice.issue_date ? new Date(viewInvoice.issue_date).toLocaleDateString() :
                     viewInvoice.created_at ? new Date(viewInvoice.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className="font-medium">
                    {viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString() : 'On receipt'}
                  </p>
                </div>
              </div>

              {viewInvoice.subtotal && viewInvoice.subtotal !== viewInvoice.total && (
                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span>{formatCurrency(viewInvoice.subtotal)}</span>
                  </div>
                  {viewInvoice.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax ({viewInvoice.tax_rate}%)</span>
                      <span>{formatCurrency(viewInvoice.tax_amount)}</span>
                    </div>
                  )}
                  {viewInvoice.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(viewInvoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(viewInvoice.total)}</span>
                  </div>
                </div>
              )}

              {viewInvoice.notes && (
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-1">Notes</p>
                  {viewInvoice.notes}
                </div>
              )}

              {viewInvoice.status === 'paid' && viewInvoice.paid_at && (
                <div className="bg-emerald-50 p-3 rounded-lg flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Paid on {new Date(viewInvoice.paid_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
