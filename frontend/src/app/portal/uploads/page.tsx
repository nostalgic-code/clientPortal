'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Upload,
  File,
  Image,
  FileText,
  Film,
  Trash2,
  Download,
  Plus,
  Loader2,
  FolderOpen,
  Palette,
  BookOpen,
  Package,
  X,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { portalApi, ClientUpload } from '@/lib/api';

const categoryConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  logo: { label: 'Logo', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50' },
  brand: { label: 'Brand Assets', icon: Package, color: 'text-pink-600', bg: 'bg-pink-50' },
  content: { label: 'Content', icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
  document: { label: 'Document', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
  image: { label: 'Image', icon: Image, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  video: { label: 'Video', icon: Film, color: 'text-red-600', bg: 'bg-red-50' },
  other: { label: 'Other', icon: File, color: 'text-slate-600', bg: 'bg-slate-100' },
};

function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PortalUploadsPage() {
  const [uploads, setUploads] = useState<ClientUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploadNotes, setUploadNotes] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUploads();
  }, [filterCategory]);

  const fetchUploads = async () => {
    try {
      const data = await portalApi.getUploads(filterCategory !== 'all' ? filterCategory : undefined);
      setUploads(data.uploads);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch uploads',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await portalApi.uploadFile(selectedFile, uploadCategory, uploadNotes);
      toast({
        title: 'File Uploaded',
        description: `${selectedFile.name} has been uploaded successfully.`,
      });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setUploadCategory('other');
      setUploadNotes('');
      fetchUploads();
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    setDeletingId(id);
    try {
      await portalApi.deleteUpload(id);
      toast({
        title: 'File Deleted',
        description: `${filename} has been removed.`,
      });
      fetchUploads();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id: string, filename: string) => {
    try {
      await portalApi.downloadUpload(id, filename);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadDialog(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadDialog(true);
    }
  };

  const getFileIcon = (upload: ClientUpload) => {
    const config = categoryConfig[upload.category] || categoryConfig.other;
    const Icon = config.icon;
    return (
      <div className={`p-2.5 rounded-lg ${config.bg}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
    );
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Upload Files</h1>
          <p className="text-slate-500 mt-1">Share logos, content, and project assets</p>
        </div>
        <Button
          onClick={() => {
            setSelectedFile(null);
            setShowUploadDialog(true);
          }}
          className="bg-black hover:bg-black/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
      >
        <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Drop files here or click to browse</p>
        <p className="text-sm text-slate-400 mt-1">
          Supports images, PDFs, documents, videos & more (max 16MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Category Filter */}
      {uploads.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory('all')}
            className={filterCategory === 'all' ? 'bg-black hover:bg-black/90' : ''}
          >
            All ({uploads.length})
          </Button>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = uploads.filter(u => u.category === key).length;
            if (count === 0 && filterCategory === 'all') return null;
            return (
              <Button
                key={key}
                variant={filterCategory === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(key)}
                className={filterCategory === key ? 'bg-black hover:bg-black/90' : ''}
              >
                {config.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* File List */}
      {uploads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No Files Uploaded</h3>
            <p className="text-slate-500 text-sm mt-1">
              Upload logos, brand assets, website content, and other project files.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {uploads.map((upload) => (
            <Card key={upload.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(upload)}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{upload.filename}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Badge variant="outline" className="text-xs">
                          {(categoryConfig[upload.category] || categoryConfig.other).label}
                        </Badge>
                        <span>{formatFileSize(upload.size)}</span>
                        <span>·</span>
                        <span>{new Date(upload.uploaded_at).toLocaleDateString()}</span>
                      </div>
                      {upload.notes && (
                        <p className="text-sm text-slate-400 mt-0.5 truncate">{upload.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(upload.id, upload.filename)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(upload.id, upload.filename)}
                      disabled={deletingId === upload.id}
                    >
                      {deletingId === upload.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Choose a file and categorize it for your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* File Select */}
            {selectedFile ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Click to select a file</p>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Describe this file, e.g., 'Primary company logo in PNG format'"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="bg-black hover:bg-black/90"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
