'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, Printer, ExternalLink, Monitor } from 'lucide-react';
import { proposalsApi, Proposal } from '@/lib/api';
import { getToken } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { ProposalDocument } from '@/components/proposal-document';

export default function ProposalPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const proposalId = params.id as string;

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  const fetchProposal = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await proposalsApi.get(token, proposalId);
      setProposal(data.proposal);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load proposal',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const token = await getToken();
    if (!token || !proposal) return;

    try {
      const result = await proposalsApi.send(token, proposal.id);
      const fullUrl = `${window.location.origin}${result.public_url}`;
      navigator.clipboard.writeText(fullUrl);
      toast({
        title: 'Proposal sent!',
        description: 'Public link copied to clipboard',
      });
      fetchProposal();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send proposal',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'sent': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'accepted': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-[820px] px-4">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="h-[700px] bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Monitor className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-700">Proposal Not Found</h2>
          <Button variant="outline" onClick={() => router.push('/dashboard/proposals')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 print:bg-white">
      {/* Floating Toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-[920px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-900"
              onClick={() => router.push('/dashboard/proposals')}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                {proposal.title || `Proposal for ${proposal.client?.name}`}
              </span>
              <Badge variant="outline" className={`text-[0.65rem] px-2 py-0.5 ${getStatusColor(proposal.status)}`}>
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-900"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print
            </Button>
            {proposal.status === 'draft' && (
              <Button size="sm" onClick={handleSend}>
                <Send className="w-4 h-4 mr-1.5" />
                Send to Client
              </Button>
            )}
            {proposal.public_token && (
              <Link href={`/proposal/${proposal.public_token}`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Public Link
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Client View Label */}
      <div className="print:hidden max-w-[820px] mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Monitor className="w-3.5 h-3.5" />
          <span>Client view preview — this is exactly how your client will see the proposal</span>
        </div>
      </div>

      {/* Proposal Document — exact client view */}
      <div className="px-4 py-4 print:px-0 print:py-0">
        <ProposalDocument
          content={proposal.content || ''}
          clientName={proposal.client?.name}
          totalAmount={proposal.total_amount}
          currency={proposal.currency || 'R'}
          status={proposal.status}
          createdAt={proposal.created_at}
          showActions={false}
        />
      </div>
    </div>
  );
}
