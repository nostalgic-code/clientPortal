'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, FileText, Send, ExternalLink, Copy, Eye } from 'lucide-react';
import { proposalsApi, clientsApi, templatesApi, Proposal, Client, DocumentTemplate } from '@/lib/api';
import { getToken } from '@/lib/supabase';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProposal, setNewProposal] = useState({
    client_id: '',
    template_id: '',
    total_amount: '',
    variables: {} as Record<string, string>,
  });
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-open create dialog if template_id is in URL (coming from templates page)
  useEffect(() => {
    const templateId = searchParams.get('template_id');
    if (templateId && !isLoading) {
      setNewProposal(prev => ({ ...prev, template_id: templateId }));
      setIsCreateOpen(true);
    }
  }, [searchParams, isLoading]);

  const fetchData = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const [proposalsRes, clientsRes, templatesRes] = await Promise.all([
        proposalsApi.list(token),
        clientsApi.list(token),
        templatesApi.list(token, 'proposal'),
      ]);

      setProposals(proposalsRes.proposals);
      setClients(clientsRes.clients);
      setTemplates(templatesRes.templates);
    } catch (error) {
      console.error('Failed to fetch proposals data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      await proposalsApi.create(token, {
        client_id: newProposal.client_id,
        template_id: newProposal.template_id,
        total_amount: newProposal.total_amount ? Number(newProposal.total_amount) : undefined,
        variables: newProposal.variables,
      });
      toast({
        title: 'Success',
        description: 'Proposal created successfully',
      });
      setIsCreateOpen(false);
      setNewProposal({ client_id: '', template_id: '', total_amount: '', variables: {} });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create proposal',
        variant: 'destructive',
      });
    }
  };

  const handleSendProposal = async (proposalId: string) => {
    const token = await getToken();
    if (!token) return;

    try {
      const result = await proposalsApi.send(token, proposalId);
      toast({
        title: 'Proposal sent',
        description: 'Public link has been generated',
      });
      
      // Copy link to clipboard
      const fullUrl = `${window.location.origin}${result.public_url}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: 'Link copied',
        description: 'Proposal link copied to clipboard',
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send proposal',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent':
        return <Badge variant="warning">Sent</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Proposals</h1>
          <p className="text-slate-600">Create and manage client proposals</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Proposal</DialogTitle>
              <DialogDescription>
                Select a client and template to create a proposal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select 
                  value={newProposal.client_id} 
                  onValueChange={(v) => setNewProposal({ ...newProposal, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select 
                  value={newProposal.template_id} 
                  onValueChange={(v) => setNewProposal({ ...newProposal, template_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount (R)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newProposal.total_amount}
                  onChange={(e) => setNewProposal({ ...newProposal, total_amount: e.target.value })}
                  placeholder="5000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateProposal} disabled={!newProposal.client_id || !newProposal.template_id}>
                Create Proposal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No proposals yet</h3>
          <p className="text-muted-foreground mb-4">Create your first proposal to get started</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{proposal.client?.name}</CardTitle>
                    <CardDescription>
                      Created {new Date(proposal.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {proposal.total_amount && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold text-lg">R{proposal.total_amount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/proposals/${proposal.id}/preview`}>
                      <Button variant="outline" size="icon" title="Preview proposal">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>

                    {proposal.status === 'draft' && (
                      <Button 
                        className="flex-1"
                        onClick={() => handleSendProposal(proposal.id)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send to Client
                      </Button>
                    )}
                    
                    {proposal.status === 'sent' && proposal.public_token && (
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const url = `${window.location.origin}/proposal/${proposal.public_token}`;
                          navigator.clipboard.writeText(url);
                          toast({
                            title: 'Link copied',
                            description: 'Proposal link copied to clipboard',
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                    )}

                    {proposal.public_token && (
                      <Link href={`/proposal/${proposal.public_token}`} target="_blank">
                        <Button variant="outline" size="icon">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
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
