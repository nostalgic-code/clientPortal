'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, FileText, Eye, Edit, Copy, Trash2, Search, MoreHorizontal, FileSignature, Receipt, Calendar, Clock, BarChart3, Users, Heart, Send } from 'lucide-react';
import { templatesApi, DocumentTemplate, DocumentType, TemplateType } from '@/lib/api';
import { getToken } from '@/lib/supabase';
import { ProposalDocument } from '@/components/proposal-document';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TEMPLATE_ICONS: Record<DocumentType, React.ReactNode> = {
  welcome: <Heart className="w-5 h-5" />,
  agreement: <FileSignature className="w-5 h-5" />,
  invoice: <Receipt className="w-5 h-5" />,
  proposal: <Send className="w-5 h-5" />,
  strategy_call: <Calendar className="w-5 h-5" />,
  project_timeline: <Clock className="w-5 h-5" />,
  deliverables: <FileText className="w-5 h-5" />,
  content_guide: <FileText className="w-5 h-5" />,
  monthly_report: <BarChart3 className="w-5 h-5" />,
  competitor_analysis: <Users className="w-5 h-5" />,
  thank_you: <Heart className="w-5 h-5" />,
  custom: <FileText className="w-5 h-5" />,
};

const TEMPLATE_COLORS: Record<DocumentType, string> = {
  welcome: 'bg-pink-100 text-pink-800 border-pink-200',
  agreement: 'bg-green-100 text-green-800 border-green-200',
  invoice: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  proposal: 'bg-blue-100 text-blue-800 border-blue-200',
  strategy_call: 'bg-purple-100 text-purple-800 border-purple-200',
  project_timeline: 'bg-orange-100 text-orange-800 border-orange-200',
  deliverables: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  content_guide: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  monthly_report: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  competitor_analysis: 'bg-rose-100 text-rose-800 border-rose-200',
  thank_you: 'bg-violet-100 text-violet-800 border-violet-200',
  custom: 'bg-slate-100 text-slate-800 border-slate-200',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewContent, setPreviewContent] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const router = useRouter();
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    type: 'welcome' as DocumentType,
    content: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchTemplateTypes();
  }, []);

  const fetchTemplates = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await templatesApi.list(token);
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateTypes = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await templatesApi.getTypes(token);
      setTemplateTypes(data.types);
    } catch (error) {
      console.error('Failed to fetch template types:', error);
    }
  };

  const handleCreateTemplate = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      await templatesApi.create(token, newTemplate);
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      setIsCreateOpen(false);
      setNewTemplate({ name: '', description: '', type: 'welcome', content: '' });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (template: DocumentTemplate) => {
    const token = await getToken();
    if (!token) return;

    try {
      await templatesApi.duplicate(token, template.id);
      toast({
        title: 'Success',
        description: 'Template duplicated successfully',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    const token = await getToken();
    if (!token) return;

    try {
      await templatesApi.delete(token, templateToDelete.id);
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      setIsDeleteOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleUseTemplate = (template: DocumentTemplate) => {
    // Navigate to the relevant page based on template type
    const typeToRoute: Record<string, string> = {
      proposal: '/dashboard/proposals',
      invoice: '/dashboard/invoices',
      agreement: '/dashboard/documents',
    };
    const route = typeToRoute[template.type] || '/dashboard/documents';
    // Pass template ID as query param so the destination page can pre-select it
    router.push(`${route}?template_id=${template.id}`);
  };

  const handlePreview = async (template: DocumentTemplate) => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await templatesApi.preview(token, template.id, {});
      setPreviewContent(data.rendered_content);
    } catch (error) {
      // Fallback: use raw template content if preview API fails
      setPreviewContent(template.content || '');
    }
    setSelectedTemplate(template);
    setIsViewOpen(true);
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;
    const token = await getToken();
    if (!token) return;

    try {
      await templatesApi.update(token, selectedTemplate.id, {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        content: selectedTemplate.content,
      });
      toast({
        title: 'Success',
        description: 'Template updated successfully',
      });
      setIsEditOpen(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update template',
        variant: 'destructive',
      });
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getDefaultContent = (type: DocumentType) => {
    const defaults: Record<DocumentType, string> = {
      welcome: `# WELCOME

Hey **{{client_name}}**,

Thank you for choosing to work with us. We're thrilled to have the opportunity to bring your vision to life.

## CLIENT PORTAL LINK

**[Access Your Portal]({{portal_link}})**

Inside your portal you'll find:
- **Project Overview**: Goals, timelines, and deliverables
- **Documents**: Agreements and invoices
- **Timeline**: Real-time progress updates
- **Deliverables**: Access all your files

---

**{{company_name}}**`,
      agreement: `# SERVICE AGREEMENT

**Date**: {{date}}
**Agreement Number**: {{agreement_number}}

## PARTIES

**Service Provider**: {{company_name}}
**Client**: {{client_name}}

## SCOPE OF WORK

{{scope_of_work}}

## INVESTMENT

**Total**: {{total_amount}} {{currency}}

## SIGNATURES

**Client Signature**: _________________________
**Date**: _________________________`,
      invoice: `# INVOICE

**Invoice #**: {{invoice_number}}
**Date**: {{issue_date}}
**Due Date**: {{due_date}}

## Bill To
{{client_name}}
{{client_email}}

## Services

{{line_items}}

**Total**: {{total}} {{currency}}

## Payment

[Pay Now]({{payment_link}})`,
      proposal: `# PROJECT PROPOSAL

**Prepared for**: {{client_name}}
**Date**: {{date}}

## Overview

{{proposed_solution}}

## Deliverables

{{deliverables}}

## Investment

**Total**: {{total_amount}} {{currency}}

---
**{{company_name}}**`,
      strategy_call: `# STRATEGY CALL

**Topic**: {{call_topic}}
**Date**: {{scheduled_date}} at {{scheduled_time}}
**Duration**: {{duration}} minutes

## Join the Call

[Join Meeting]({{meeting_link}})

## Agenda

{{agenda}}`,
      project_timeline: `# PROJECT UPDATES

## Project: {{project_name}}
**Last Updated**: {{last_updated}}

## Current Status

**Phase**: {{current_phase}}
**Progress**: {{overall_progress}}%

## Timeline

{{phases}}`,
      deliverables: `# DELIVERABLES

**Project**: {{project_name}}
**Delivery Date**: {{delivery_date}}

## Access Your Files

[Download All]({{deliverables_link}})

## Included

{{deliverables}}`,
      content_guide: `# CONTENT USAGE GUIDE

Hey **{{client_name}}**,

This guide will help you get the most out of your content.

## Transferring Files

### Mac Users
Use AirDrop to transfer files without quality loss.

### Windows Users
Use iCloud Drive or Snapdrop.net

## Posting Tips

- Best times: {{best_posting_times}}
- Use 5-10 relevant hashtags
- Engage with comments in the first hour`,
      monthly_report: `# MONTHLY REPORT

**Period**: {{period_start}} - {{period_end}}

## Highlights

{{highlights}}

## Key Metrics

| Metric | This Month | Change |
|--------|------------|--------|
| Followers | {{followers_current}} | {{followers_change}} |
| Engagement | {{engagement_current}} | {{engagement_change}} |

## Recommendations

{{recommendations}}`,
      competitor_analysis: `# COMPETITOR ANALYSIS

**Client**: {{client_name}}
**Date**: {{analysis_date}}

## Overview

{{competitor_overview}}

## Key Takeaways

{{key_takeaways}}

## Recommendations

{{recommendations}}`,
      thank_you: `# THANK YOU

**Project**: {{project_name}}

## Your Deliverables

[Access Files]({{deliverables_link}})

## It Was Great Working With You!

We truly appreciate the opportunity to bring your vision to life.

### Want More Content?

[Schedule a Call]({{call_link}})

### We'd Love Your Feedback

[Share Your Thoughts]({{testimonial_link}})

---
**{{company_name}}**`,
      custom: `# {{title}}

{{content}}`,
    };
    return defaults[type] || defaults.custom;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-slate-900">Document Templates</h1>
          <p className="text-slate-600">Create and manage reusable document templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable document template with markdown and variables
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Welcome Document"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newTemplate.type}
                    onValueChange={(value: DocumentType) => {
                      setNewTemplate({
                        ...newTemplate,
                        type: value,
                        content: newTemplate.content || getDefaultContent(value),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          <div className="flex items-center gap-2">
                            {TEMPLATE_ICONS[type.id]}
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Brief description of this template"
                />
              </div>
              <div className="space-y-2">
                <Label>Content (Markdown with {'{{variables}}'} )</Label>
                <Tabs defaultValue="edit">
                  <TabsList>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      value={newTemplate.content}
                      onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                      placeholder="Enter markdown content..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="border rounded-lg p-6 min-h-[400px] bg-white prose prose-sm max-w-none overflow-y-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {newTemplate.content || '*No content yet*'}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {['client_name', 'client_email', 'company_name', 'project_name', 'date', 'portal_link'].map((v) => (
                    <code key={v} className="px-2 py-1 bg-slate-200 rounded text-xs">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={!newTemplate.name || !newTemplate.content}>
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {templateTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No templates found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first template to get started'}
          </p>
          {!searchQuery && typeFilter === 'all' && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${TEMPLATE_COLORS[template.type]}`}>
                    {TEMPLATE_ICONS[template.type]}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDelete(template)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                {template.description && (
                  <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className={TEMPLATE_COLORS[template.type]}>
                    {template.type.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-slate-500">v{template.version}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                >
                  <Send className="w-3.5 h-3.5 mr-2" />
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              {selectedTemplate && (
                <div className={`p-2 rounded-lg ${TEMPLATE_COLORS[selectedTemplate.type]}`}>
                  {TEMPLATE_ICONS[selectedTemplate.type]}
                </div>
              )}
              <div>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>
                  {selectedTemplate?.type.replace('_', ' ')} template preview
                  {selectedTemplate?.description && ` — ${selectedTemplate.description}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6">
            {selectedTemplate?.type === 'proposal' ? (
              <div className="border rounded-xl overflow-hidden">
                <ProposalDocument
                  content={previewContent}
                  clientName="[Client Name]"
                  totalAmount={0}
                  status="draft"
                  createdAt={new Date().toISOString()}
                  showActions={false}
                />
              </div>
            ) : (
              <div className="border rounded-xl p-8 bg-white">
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-3 pb-2 border-b border-slate-200 first:mt-0">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-slate-800 mt-5 mb-2">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-slate-600 leading-relaxed mb-3">{children}</p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-slate-800">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-5 mb-3 space-y-1 text-slate-600">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-5 mb-3 space-y-1 text-slate-600">{children}</ol>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/30 bg-primary/5 pl-4 py-2 my-3 italic text-slate-600 rounded-r">
                          {children}
                        </blockquote>
                      ),
                      hr: () => (
                        <div className="my-6 flex items-center gap-2">
                          <div className="flex-1 border-t border-slate-200" />
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          <div className="flex-1 border-t border-slate-200" />
                        </div>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                          <table className="w-full text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-slate-50 text-slate-700 font-semibold">{children}</thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-slate-100">{children}</tbody>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-2.5 text-left text-xs uppercase tracking-wider">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-2.5 text-slate-600">{children}</td>
                      ),
                      a: ({ children, href }) => (
                        <a href={href} className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                      code: ({ children }) => (
                        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm font-mono text-slate-700">{children}</code>
                      ),
                    }}
                  >
                    {previewContent}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Variables like {'{{client_name}}'} will be replaced with real values when the document is generated
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={selectedTemplate.name}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Input value={selectedTemplate.type.replace('_', ' ')} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={selectedTemplate.description || ''}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={selectedTemplate.content}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, content: e.target.value })}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTemplate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>&quot;{templateToDelete?.name}&quot;</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setTemplateToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
