'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, getToken } from '@/lib/supabase';
import { documentsApi, Document, DocumentType, clientsApi, Client, projectsApi, Project, templatesApi, DocumentTemplate } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Send,
  ExternalLink,
  FileSignature,
  Clock,
  CheckCircle2,
  XCircle,
  Mail,
  ScrollText,
  Receipt,
  Video,
  Calendar,
  Package,
  BookOpen,
  BarChart3,
  Users,
  Heart,
  Settings,
  Copy,
  Loader2,
} from 'lucide-react';

const DOCUMENT_ICONS: Record<DocumentType, React.ReactNode> = {
  welcome: <Mail className="w-5 h-5" />,
  agreement: <ScrollText className="w-5 h-5" />,
  invoice: <Receipt className="w-5 h-5" />,
  proposal: <FileText className="w-5 h-5" />,
  strategy_call: <Video className="w-5 h-5" />,
  project_timeline: <Calendar className="w-5 h-5" />,
  deliverables: <Package className="w-5 h-5" />,
  content_guide: <BookOpen className="w-5 h-5" />,
  monthly_report: <BarChart3 className="w-5 h-5" />,
  competitor_analysis: <Users className="w-5 h-5" />,
  thank_you: <Heart className="w-5 h-5" />,
  custom: <Settings className="w-5 h-5" />,
};

const DOCUMENT_COLORS: Record<DocumentType, string> = {
  welcome: 'bg-green-100 text-green-700',
  agreement: 'bg-purple-100 text-purple-700',
  invoice: 'bg-blue-100 text-blue-700',
  proposal: 'bg-amber-100 text-amber-700',
  strategy_call: 'bg-pink-100 text-pink-700',
  project_timeline: 'bg-indigo-100 text-indigo-700',
  deliverables: 'bg-cyan-100 text-cyan-700',
  content_guide: 'bg-orange-100 text-orange-700',
  monthly_report: 'bg-teal-100 text-teal-700',
  competitor_analysis: 'bg-red-100 text-red-700',
  thank_you: 'bg-rose-100 text-rose-700',
  custom: 'bg-slate-100 text-slate-700',
};

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: <Clock className="w-3 h-3" /> },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: <Send className="w-3 h-3" /> },
  viewed: { label: 'Viewed', color: 'bg-amber-100 text-amber-700', icon: <Eye className="w-3 h-3" /> },
  signed: { label: 'Signed', color: 'bg-green-100 text-green-700', icon: <FileSignature className="w-3 h-3" /> },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

const DOCUMENT_TYPES: DocumentType[] = [
  'welcome', 'agreement', 'invoice', 'proposal', 'strategy_call', 
  'project_timeline', 'deliverables', 'content_guide', 'monthly_report', 
  'competitor_analysis', 'thank_you', 'custom'
];

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Send & Delete confirmation states
  const [sendConfirmDoc, setSendConfirmDoc] = useState<Document | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Create form
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'welcome' as DocumentType,
    content: '',
    client_id: '',
    project_id: '',
    template_id: '',
  });

  const getAccessToken = async (): Promise<string> => {
    const token = await getToken();
    if (!token) {
      router.push('/login');
      throw new Error('No session');
    }
    return token;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      
      const [docsRes, clientsRes, projectsRes, templatesRes] = await Promise.all([
        documentsApi.list(token),
        clientsApi.list(token),
        projectsApi.list(token),
        templatesApi.list(token),
      ]);
      
      setDocuments(docsRes.documents || []);
      setClients(clientsRes.clients || []);
      setProjects(projectsRes.projects || []);
      setTemplates(templatesRes.templates || []);
    } catch (err: any) {
      if (err.message === 'No session') {
        return;
      }
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-open create dialog if template_id is in URL
  useEffect(() => {
    const templateId = searchParams.get('template_id');
    if (templateId && !loading && templates.length > 0) {
      const tmpl = templates.find(t => t.id === templateId);
      if (tmpl) {
        setNewDocument(prev => ({
          ...prev,
          template_id: templateId,
          type: tmpl.type,
          name: `${tmpl.name} - `,
          content: tmpl.content || '',
        }));
        setIsCreateOpen(true);
      }
    }
  }, [searchParams, loading, templates]);

  const handleTemplateSelect = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setNewDocument(prev => ({
        ...prev,
        template_id: templateId,
        type: tmpl.type,
        content: tmpl.content || '',
        name: prev.name || `${tmpl.name} - `,
      }));
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && doc.type !== typeFilter) {
        return false;
      }
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false;
      }
      if (clientFilter !== 'all' && doc.client_id !== clientFilter) {
        return false;
      }
      return true;
    });
  }, [documents, searchQuery, typeFilter, statusFilter, clientFilter]);

  const handleCreate = async () => {
    try {
      const token = await getAccessToken();
      await documentsApi.create(token, {
        name: newDocument.name,
        type: newDocument.type,
        content: newDocument.content,
        client_id: newDocument.client_id,
        project_id: newDocument.project_id || undefined,
      });
      setIsCreateOpen(false);
      setNewDocument({ name: '', type: 'welcome', content: '', client_id: '', project_id: '', template_id: '' });
      loadData();
      toast({
        title: 'Document created',
        description: `"${newDocument.name}" has been created as a draft.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to create document',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!selectedDocument) return;
    try {
      const token = await getAccessToken();
      await documentsApi.update(token, selectedDocument.id, {
        name: selectedDocument.name,
        content: selectedDocument.content,
      });
      setIsEditOpen(false);
      loadData();
      toast({
        title: 'Document updated',
        description: `"${selectedDocument.name}" has been saved.`,
      });
    } catch (err: any) {
      toast({
        title: 'Update failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmDoc) return;
    setIsDeleting(true);
    try {
      const token = await getAccessToken();
      await documentsApi.delete(token, deleteConfirmDoc.id);
      toast({
        title: 'Document deleted',
        description: `"${deleteConfirmDoc.name}" has been permanently removed.`,
      });
      setDeleteConfirmDoc(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSend = async () => {
    if (!sendConfirmDoc) return;
    setIsSending(true);
    try {
      const token = await getAccessToken();
      await documentsApi.send(token, sendConfirmDoc.id);
      toast({
        title: 'Document sent successfully!',
        description: `"${sendConfirmDoc.name}" has been sent to ${sendConfirmDoc.clients?.name || 'the client'}. They will be able to view it in their portal.`,
      });
      setSendConfirmDoc(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to send document',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyPublicLink = (doc: Document) => {
    const url = `${window.location.origin}/documents/view/${doc.public_token}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied!',
      description: 'Public document link has been copied to your clipboard.',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }



  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-500">Manage and track all your client documents</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={String(client.id)}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count = documents.filter(d => d.status === status).length;
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter(status)}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-slate-500">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first document to get started'}
          </p>
          {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${DOCUMENT_COLORS[doc.type]}`}>
                    {DOCUMENT_ICONS[doc.type]}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate">{doc.name}</h3>
                      <Badge variant="secondary" className={STATUS_CONFIG[doc.status].color}>
                        {STATUS_CONFIG[doc.status].icon}
                        <span className="ml-1">{STATUS_CONFIG[doc.status].label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{doc.clients?.name || 'Unknown client'}</span>
                      {doc.projects?.name && (
                        <>
                          <span>•</span>
                          <span>{doc.projects.name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                  </div>

                  {/* Type Badge */}
                  <Badge variant="outline" className={DOCUMENT_COLORS[doc.type]}>
                    {doc.type.replace('_', ' ')}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsViewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View document</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit document</TooltipContent>
                    </Tooltip>
                    {doc.status === 'draft' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSendConfirmDoc(doc)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send to client</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyPublicLink(doc)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy public link</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteConfirmDoc(doc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete document</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Document Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a document from scratch or use a template
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Template selector */}
            <div className="space-y-2">
              <Label>Start from Template (optional)</Label>
              <Select
                value={newDocument.template_id}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template to auto-fill..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {tmpl.type.replace('_', ' ')}
                        </Badge>
                        {tmpl.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                  placeholder="Welcome Document - Client Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newDocument.type}
                  onValueChange={(v) => setNewDocument({ ...newDocument, type: v as DocumentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={newDocument.client_id}
                  onValueChange={(v) => setNewDocument({ ...newDocument, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <Select
                  value={newDocument.project_id || "none"}
                  onValueChange={(v) => setNewDocument({ ...newDocument, project_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown)</Label>
              <Textarea
                value={newDocument.content}
                onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                placeholder="Enter document content..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newDocument.name || !newDocument.client_id}>
              Create Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && DOCUMENT_ICONS[selectedDocument.type]}
              {selectedDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={STATUS_CONFIG[selectedDocument.status].color}>
                    {STATUS_CONFIG[selectedDocument.status].label}
                  </Badge>
                  <span>•</span>
                  <span>{selectedDocument.clients?.name}</span>
                  {selectedDocument.sent_at && (
                    <>
                      <span>•</span>
                      <span>Sent: {formatDate(selectedDocument.sent_at)}</span>
                    </>
                  )}
                  {selectedDocument.signed_at && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">Signed: {formatDate(selectedDocument.signed_at)}</span>
                    </>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-slate-50 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedDocument?.content || '*No content*'}
            </ReactMarkdown>
          </div>
          {selectedDocument?.signature_data && (
            <div className="border rounded-lg p-4 bg-green-50">
              <h4 className="font-medium text-green-800 mb-2">Signature</h4>
              <p className="text-sm text-green-700">
                Signed by: {selectedDocument.signature_data.name}
              </p>
              <p className="text-sm text-green-700">
                Date: {formatDate(selectedDocument.signature_data.signed_at)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => copyPublicLink(selectedDocument!)}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            {selectedDocument?.status === 'draft' && (
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setIsViewOpen(false);
                  setSendConfirmDoc(selectedDocument);
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Client
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input
                  value={selectedDocument.name}
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedDocument.content}
                  onChange={(e) => setSelectedDocument({ ...selectedDocument, content: e.target.value })}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation Dialog */}
      <AlertDialog open={!!sendConfirmDoc} onOpenChange={(open) => !open && setSendConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Send Document to Client
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to send <strong className="text-slate-900">"{sendConfirmDoc?.name}"</strong> to{' '}
                <strong className="text-slate-900">{sendConfirmDoc?.clients?.name || 'the client'}</strong>.
              </p>
              <p>
                The client will be notified and can view this document in their portal. This action will change the document status from Draft to Sent.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={isSending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Document
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDoc} onOpenChange={(open) => !open && setDeleteConfirmDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete <strong className="text-slate-900">"{deleteConfirmDoc?.name}"</strong>?
              </p>
              <p>
                This action cannot be undone. The document will be removed and any public links will stop working.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
