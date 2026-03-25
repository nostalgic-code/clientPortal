'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Receipt, CheckCircle2, Clock, AlertTriangle, Plus, XCircle, Loader2, FileText } from 'lucide-react';
import { invoicesApi, projectsApi, templatesApi, Invoice, Project } from '@/lib/api';
import { getToken } from '@/lib/supabase';

/** Parse a numeric value from template defaults (e.g. "15% VAT" → "15") */
function parseNumeric(val: any): string {
  if (val == null) return '';
  const s = String(val);
  const m = s.match(/[\d.]+/);
  return m ? m[0] : '';
}

/** Try to extract due-days from payment_terms like "Due within 7 days …" */
function parseDueDays(terms: any): string | null {
  if (!terms) return null;
  const m = String(terms).match(/(\d+)\s*days?/i);
  return m ? m[1] : null;
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/4"></div></div></div>}>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    project_id: '',
    subtotal: '',
    tax_rate: '0',
    discount_amount: '0',
    currency: 'ZAR',
    due_days: '30',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  // Apply template when template_id is in URL and data is loaded
  useEffect(() => {
    const templateId = searchParams.get('template_id');
    if (!templateId || isLoading) return;

    const applyTemplate = async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const res = await templatesApi.get(token, templateId);
        const tmpl = res.template;
        const dv = tmpl.default_values || {};

        // Map template defaults → invoice form fields
        const taxRate = parseNumeric(dv.tax_rate) || '0';
        const discount = parseNumeric(dv.discount ?? dv.discount_amount) || '0';
        const currency = (['ZAR', 'USD', 'EUR', 'GBP'].includes(String(dv.currency).toUpperCase()))
          ? String(dv.currency).toUpperCase()
          : 'ZAR';
        const dueDays = parseDueDays(dv.payment_terms) || parseNumeric(dv.due_days) || '30';
        const subtotal = parseNumeric(dv.subtotal) || '';
        const description = dv.description || dv.notes || tmpl.description || '';

        setNewInvoice(prev => ({
          ...prev,
          subtotal,
          tax_rate: taxRate,
          discount_amount: discount,
          currency,
          due_days: dueDays,
          description,
        }));

        setTemplateName(tmpl.name);
        setIsCreateOpen(true);

        toast({
          title: 'Template applied',
          description: `"${tmpl.name}" defaults loaded — select a project and adjust values.`,
        });

        // Clean the URL so reloads don't re-apply
        router.replace('/dashboard/invoices', { scroll: false });
      } catch (err) {
        console.error('Failed to load template:', err);
        toast({
          title: 'Template error',
          description: 'Could not load the template. You can still create an invoice manually.',
          variant: 'destructive',
        });
      }
    };

    applyTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isLoading]);

  const fetchData = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const [invoiceData, projectData] = await Promise.all([
        invoicesApi.list(token),
        projectsApi.list(token),
      ]);
      setInvoices(invoiceData.invoices || []);
      setProjects(projectData.projects || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    const token = await getToken();
    if (!token) return;

    setIsCreating(true);
    try {
      await invoicesApi.create(token, {
        project_id: newInvoice.project_id,
        subtotal: parseFloat(newInvoice.subtotal),
        tax_rate: parseFloat(newInvoice.tax_rate) || 0,
        discount_amount: parseFloat(newInvoice.discount_amount) || 0,
        currency: newInvoice.currency,
        due_days: parseInt(newInvoice.due_days) || 30,
        description: newInvoice.description,
      });
      toast({ title: 'Success', description: 'Invoice created and sent to client' });
      setIsCreateOpen(false);
      setNewInvoice({ project_id: '', subtotal: '', tax_rate: '0', discount_amount: '0', currency: 'ZAR', due_days: '30', description: '' });
      setTemplateName(null);
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create invoice', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    const token = await getToken();
    if (!token) return;

    try {
      await invoicesApi.markPaid(token, invoiceId);
      toast({ title: 'Success', description: 'Invoice marked as paid' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update invoice', variant: 'destructive' });
    }
  };

  const handleCancel = async (invoiceId: string) => {
    const token = await getToken();
    if (!token) return;

    try {
      await invoicesApi.cancel(token, invoiceId);
      toast({ title: 'Success', description: 'Invoice cancelled' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to cancel invoice', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ZAR') => {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Paid</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Sent</Badge>;
      case 'draft': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Draft</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'sent': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'cancelled': return <XCircle className="w-5 h-5 text-slate-400" />;
      default: return <Receipt className="w-5 h-5 text-slate-400" />;
    }
  };

  const getInvoiceTotal = (inv: Invoice) => inv.total || inv.subtotal || 0;

  const totalSent = invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + getInvoiceTotal(i), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + getInvoiceTotal(i), 0);

  // Compute preview total
  const previewSubtotal = parseFloat(newInvoice.subtotal) || 0;
  const previewTaxAmount = previewSubtotal * ((parseFloat(newInvoice.tax_rate) || 0) / 100);
  const previewDiscount = parseFloat(newInvoice.discount_amount) || 0;
  const previewTotal = previewSubtotal + previewTaxAmount - previewDiscount;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-600">Create and manage client invoices</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setTemplateName(null); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Create and send an invoice to a client.</DialogDescription>
            </DialogHeader>
            {templateName && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-50 border border-blue-100 text-sm text-blue-700">
                <FileText className="w-4 h-4 flex-shrink-0" />
                <span>Using template: <strong>{templateName}</strong></span>
              </div>
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project *</Label>
                <Select value={newInvoice.project_id} onValueChange={(v) => setNewInvoice({ ...newInvoice, project_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} {p.client?.name ? `(${p.client.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subtotal *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newInvoice.subtotal}
                    onChange={(e) => setNewInvoice({ ...newInvoice, subtotal: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={newInvoice.currency} onValueChange={(v) => setNewInvoice({ ...newInvoice, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newInvoice.tax_rate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: e.target.value })}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newInvoice.discount_amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, discount_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due in (days)</Label>
                  <Input
                    type="number"
                    value={newInvoice.due_days}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_days: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newInvoice.description}
                    onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                    placeholder="Invoice description"
                  />
                </div>
              </div>

              {/* Preview */}
              {previewSubtotal > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(previewSubtotal, newInvoice.currency)}</span>
                  </div>
                  {previewTaxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax ({newInvoice.tax_rate}%)</span>
                      <span>{formatCurrency(previewTaxAmount, newInvoice.currency)}</span>
                    </div>
                  )}
                  {previewDiscount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(previewDiscount, newInvoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-slate-900 pt-1.5 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(previewTotal, newInvoice.currency)}</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                disabled={!newInvoice.project_id || !newInvoice.subtotal || isCreating}
              >
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create & Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{formatCurrency(totalSent)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold">{formatCurrency(totalPaid)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{invoices.length}</span>
          </CardContent>
        </Card>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No invoices yet</h3>
          <p className="text-muted-foreground mb-4">Create your first invoice for a client project</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <p className="font-semibold">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{invoice.project?.name || 'Unknown Project'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {formatCurrency(getInvoiceTotal(invoice), invoice.currency)}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm text-muted-foreground">
                          Due {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(invoice.status)}
                    <div className="flex gap-2">
                      {invoice.status === 'sent' && (
                        <Button size="sm" onClick={() => handleMarkPaid(invoice.id)}>
                          Mark Paid
                        </Button>
                      )}
                      {(invoice.status === 'sent' || invoice.status === 'draft') && (
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleCancel(invoice.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
