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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Eye,
  PenTool,
  CheckCircle2,
  Clock,
  FileCheck,
  Loader2,
  X,
  ScrollText,
  FileSpreadsheet,
  Calendar,
  BarChart3,
  Megaphone,
  Heart,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { portalApi, Document } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const typeIcons: Record<string, any> = {
  welcome: Heart,
  agreement: FileCheck,
  invoice: FileSpreadsheet,
  proposal: Briefcase,
  strategy_call: Calendar,
  project_timeline: Clock,
  deliverables: ScrollText,
  content_guide: BookOpen,
  monthly_report: BarChart3,
  competitor_analysis: Megaphone,
  thank_you: Heart,
  custom: FileText,
};

const typeLabels: Record<string, string> = {
  welcome: 'Welcome Package',
  agreement: 'Agreement',
  invoice: 'Invoice',
  proposal: 'Proposal',
  strategy_call: 'Strategy Call',
  project_timeline: 'Project Timeline',
  deliverables: 'Deliverables',
  content_guide: 'Content Guide',
  monthly_report: 'Monthly Report',
  competitor_analysis: 'Competitor Analysis',
  thank_you: 'Thank You',
  custom: 'Document',
};

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [signName, setSignName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await portalApi.getDocuments();
      setDocuments(data.documents);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const data = await portalApi.getDocument(doc.id);
      setViewDoc(data.document);
      // Refresh list to update status
      fetchDocuments();
    } catch {
      setViewDoc(doc);
    }
  };

  const handleSign = async () => {
    if (!signDoc) return;
    setIsSigning(true);
    try {
      await portalApi.signDocument(signDoc.id, { name: signName || undefined });
      toast({
        title: 'Document Signed',
        description: 'Your signature has been recorded. Thank you!',
      });
      setSignDoc(null);
      setSignName('');
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sign document',
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Signed</Badge>;
      case 'viewed':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Viewed</Badge>;
      case 'sent':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">New</Badge>;
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <h1 className="text-3xl font-bold text-slate-900">Documents</h1>
        <p className="text-slate-500">View and sign your project documents</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No Documents Yet</h3>
            <p className="text-slate-500 text-sm mt-1">
              Documents will appear here when they&apos;re sent to you.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const Icon = typeIcons[doc.type] || FileText;
            const needsAction = doc.status === 'sent' || doc.status === 'viewed';
            return (
              <Card key={doc.id} className={needsAction ? 'border-amber-200 bg-amber-50/20' : ''}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                        needsAction ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          needsAction ? 'text-amber-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                        <p className="text-sm text-slate-500">
                          {typeLabels[doc.type] || doc.type}
                          {doc.sent_at && ` · Sent ${new Date(doc.sent_at).toLocaleDateString()}`}
                          {!doc.sent_at && doc.created_at && ` · ${new Date(doc.created_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(doc.status)}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                          <Eye className="w-4 h-4 mr-1.5" />
                          View
                        </Button>
                        {(doc.type === 'agreement' && (doc.status === 'sent' || doc.status === 'viewed')) && (
                          <Button size="sm" onClick={() => setSignDoc(doc)} className="bg-black hover:bg-black/90">
                            <PenTool className="w-4 h-4 mr-1.5" />
                            Sign
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {viewDoc?.name}
            </DialogTitle>
            <DialogDescription>
              {viewDoc && typeLabels[viewDoc.type]}
              {viewDoc?.sent_at && ` · Sent ${new Date(viewDoc.sent_at).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-800">
            {viewDoc?.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {viewDoc.content}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-500 italic">No content available.</p>
            )}
          </div>
          {viewDoc?.status === 'signed' && viewDoc.signature_data && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Signed by {viewDoc.signature_data.name}</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1">
                on {new Date(viewDoc.signature_data.signed_at).toLocaleString()}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sign Document Dialog */}
      <Dialog open={!!signDoc} onOpenChange={() => setSignDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Sign &quot;{signDoc?.name}&quot; to confirm your agreement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="sign-name">Your Full Name</Label>
              <Input
                id="sign-name"
                placeholder="Enter your full legal name"
                value={signName}
                onChange={(e) => setSignName(e.target.value)}
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
              By clicking &quot;Sign Document&quot; below, you acknowledge that your typed name serves
              as your electronic signature and that you agree to the terms outlined in this document.
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSignDoc(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                disabled={!signName.trim() || isSigning}
                className="bg-black hover:bg-black/90"
              >
                {isSigning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <PenTool className="w-4 h-4 mr-2" />
                )}
                Sign Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
