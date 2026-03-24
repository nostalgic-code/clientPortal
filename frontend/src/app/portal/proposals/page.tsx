'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Sparkles,
  ArrowLeft,
  Monitor,
} from 'lucide-react';
import { portalApi, Proposal } from '@/lib/api';
import { ProposalDocument } from '@/components/proposal-document';
import { Separator } from '@/components/ui/separator';

export default function PortalProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject'>('accept');
  const [isResponding, setIsResponding] = useState(false);

  const fetchProposals = async () => {
    try {
      const data = await portalApi.getProposals();
      setProposals(data.proposals);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleView = async (proposal: Proposal) => {
    try {
      const data = await portalApi.getProposal(proposal.id);
      setSelectedProposal(data.proposal);
      setViewOpen(true);
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      setSelectedProposal(proposal);
      setViewOpen(true);
    }
  };

  const openConfirm = (action: 'accept' | 'reject') => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleRespond = async () => {
    if (!selectedProposal) return;
    setIsResponding(true);
    try {
      const result = await portalApi.respondToProposal(selectedProposal.id, confirmAction);
      setConfirmOpen(false);
      setViewOpen(false);
      // Refresh proposals
      await fetchProposals();
      if (confirmAction === 'accept' && result.project) {
        // Could show a success message or redirect
      }
    } catch (error) {
      console.error('Failed to respond:', error);
    } finally {
      setIsResponding(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'R0';
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    sent: { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  };

  const pendingProposals = proposals.filter(p => p.status === 'sent');
  const respondedProposals = proposals.filter(p => p.status !== 'sent');

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
        <h1 className="text-2xl font-bold text-slate-900">Proposals</h1>
        <p className="text-slate-500 mt-1">Review and respond to project proposals.</p>
      </div>

      {proposals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No Proposals Yet</h3>
            <p className="text-slate-500 text-sm mt-1">
              Proposals from your service provider will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Pending Proposals */}
          {pendingProposals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Awaiting Your Response ({pendingProposals.length})
              </h2>
              {pendingProposals.map((proposal) => {
                const statusInfo = statusConfig[proposal.status] || statusConfig.sent;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card
                    key={proposal.id}
                    className="border-amber-200 bg-amber-50/30 hover:shadow-md transition-all"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-amber-100 rounded-xl">
                            <FileText className="w-6 h-6 text-amber-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 text-lg">
                              {proposal.title || 'Untitled Proposal'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                              {proposal.sent_at && (
                                <span>Sent {formatDate(proposal.sent_at)}</span>
                              )}
                              {proposal.total_amount && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {formatCurrency(proposal.total_amount)}
                                </span>
                              )}
                            </div>
                            <Badge className={`mt-3 ${statusInfo.color}`}>
                              <StatusIcon className="w-3.5 h-3.5 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                        </div>
                        <Button onClick={() => handleView(proposal)} className="bg-black text-white hover:bg-black/80">
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Responded Proposals */}
          {respondedProposals.length > 0 && (
            <div className="space-y-4">
              {pendingProposals.length > 0 && (
                <h2 className="text-lg font-semibold text-slate-800">Previous Proposals</h2>
              )}
              {respondedProposals.map((proposal) => {
                const statusInfo = statusConfig[proposal.status] || statusConfig.sent;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card
                    key={proposal.id}
                    className="hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2.5 bg-slate-100 rounded-lg">
                            <FileText className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900">
                              {proposal.title || 'Untitled Proposal'}
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                              {proposal.responded_at && (
                                <span>Responded {formatDate(proposal.responded_at)}</span>
                              )}
                              {proposal.total_amount && (
                                <span className="font-medium text-slate-600">
                                  {formatCurrency(proposal.total_amount)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3.5 h-3.5 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={() => handleView(proposal)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== Proposal Viewer — same style as admin preview ===== */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[920px] w-[95vw] max-h-[92vh] p-0 overflow-hidden border-0 shadow-2xl gap-0 bg-gradient-to-b from-slate-50 to-slate-100/80">
          <DialogTitle className="sr-only">
            {selectedProposal?.title || 'Proposal'}
          </DialogTitle>
          {/* Floating Toolbar */}
          <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewOpen(false)}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <Separator orientation="vertical" className="h-5" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[250px]">
                    {selectedProposal?.title || 'Proposal'}
                  </span>
                  <Badge variant="outline" className={`text-[0.65rem] px-2 py-0.5 ${
                    selectedProposal?.status === 'sent'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : selectedProposal?.status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {selectedProposal?.status === 'sent' ? 'Pending Review' :
                     selectedProposal?.status === 'accepted' ? 'Accepted' :
                     selectedProposal?.status === 'rejected' ? 'Declined' :
                     selectedProposal?.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Client View Label */}
          <div className="max-w-[820px] mx-auto w-full px-4 pt-5 pb-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Monitor className="w-3.5 h-3.5" />
              <span>Review this proposal carefully before responding</span>
            </div>
          </div>

          {/* Scrollable Document Area */}
          <div className="overflow-y-auto flex-1 px-4 py-4" style={{ maxHeight: 'calc(92vh - 110px)' }}>
            <ProposalDocument
              content={selectedProposal?.content || ''}
              clientName={undefined}
              totalAmount={selectedProposal?.total_amount}
              currency="R"
              status={selectedProposal?.status}
              createdAt={selectedProposal?.created_at}
              showActions={selectedProposal?.status === 'sent'}
              onAccept={() => openConfirm('accept')}
              onReject={() => openConfirm('reject')}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'accept' ? 'Accept Proposal?' : 'Decline Proposal?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'accept'
                ? 'By accepting this proposal, a project will be created and the onboarding process will begin. This action cannot be undone.'
                : 'Are you sure you want to decline this proposal? You can discuss changes with your service provider.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isResponding}>
              Cancel
            </Button>
            <Button
              className={confirmAction === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleRespond}
              disabled={isResponding}
            >
              {isResponding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : confirmAction === 'accept' ? (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {isResponding
                ? 'Processing...'
                : confirmAction === 'accept'
                ? 'Yes, Accept'
                : 'Yes, Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
