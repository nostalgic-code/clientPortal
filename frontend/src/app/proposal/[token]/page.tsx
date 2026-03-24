'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import { proposalsApi, PublicProposal } from '@/lib/api';
import { ProposalDocument } from '@/components/proposal-document';

export default function PublicProposalPage() {
  const params = useParams();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { toast } = useToast();

  const token = params.token as string;

  useEffect(() => {
    fetchProposal();
  }, [token]);

  const fetchProposal = async () => {
    try {
      const data = await proposalsApi.getPublic(token);
      setProposal(data.proposal);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'This proposal link is invalid or has expired',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await proposalsApi.accept(token);
      toast({
        title: 'Proposal Accepted!',
        description: 'Thank you! Your project has been created.',
      });
      fetchProposal();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to accept proposal',
        variant: 'destructive',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await proposalsApi.reject(token);
      toast({
        title: 'Proposal Declined',
        description: 'The proposal has been declined.',
      });
      fetchProposal();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject proposal',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-[820px] px-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-[600px] bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Proposal Not Found</h2>
            <p className="text-muted-foreground">
              This proposal link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 py-8 px-4">
      <ProposalDocument
        content={proposal.content || ''}
        clientName={proposal.client_name || proposal.client?.name}
        totalAmount={proposal.total_amount}
        currency={proposal.currency}
        status={proposal.status}
        createdAt={proposal.created_at}
        showActions={true}
        onAccept={handleAccept}
        onReject={handleReject}
        isAccepting={isAccepting}
        isRejecting={isRejecting}
      />
    </div>
  );
}
