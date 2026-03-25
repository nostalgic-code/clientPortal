'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  FileText,
  Image,
  Video,
  Archive,
  File,
  Loader2,
  ArrowLeft,
  UploadCloud,
  FolderOpen,
} from 'lucide-react';
import { portalApi, clientsApi, Client, ClientUpload } from '@/lib/api';
import { getToken } from '@/lib/supabase';
import Link from 'next/link';

const categoryColors: Record<string, string> = {
  logo: 'bg-violet-100 text-violet-700',
  brand: 'bg-pink-100 text-pink-700',
  content: 'bg-blue-100 text-blue-700',
  document: 'bg-amber-100 text-amber-700',
  image: 'bg-emerald-100 text-emerald-700',
  video: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-700',
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-emerald-500" />;
  if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-red-500" />;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="w-5 h-5 text-blue-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return <Archive className="w-5 h-5 text-amber-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ClientUploadsPage() {
  return (
    <Suspense fallback={<div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-slate-200 rounded w-1/4"></div><div className="h-64 bg-slate-200 rounded"></div></div></div>}>
      <ClientUploadsContent />
    </Suspense>
  );
}

function ClientUploadsContent() {
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(searchParams.get('client') || '');
  const [uploads, setUploads] = useState<ClientUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchUploads(selectedClientId);
    } else {
      setUploads([]);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await clientsApi.list(token);
      setClients(data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUploads = async (clientId: string) => {
    setIsLoadingUploads(true);
    try {
      const data = await portalApi.adminGetClientUploads(clientId);
      setUploads(data.uploads || []);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
      setUploads([]);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    if (!selectedClientId) return;
    try {
      await portalApi.adminDownloadClientUpload(selectedClientId, fileId, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Clients
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Client Uploads</h1>
        <p className="text-slate-600">View and download files uploaded by your clients</p>
      </div>

      {/* Client Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label className="font-medium text-sm whitespace-nowrap">Select Client:</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Choose a client to view their uploads" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedClientId ? (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Select a Client</h3>
          <p className="text-slate-500 text-sm mt-1">Choose a client above to view their uploaded files.</p>
        </div>
      ) : isLoadingUploads ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-16">
          <UploadCloud className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No Uploads</h3>
          <p className="text-slate-500 text-sm mt-1">
            {selectedClient?.name || 'This client'} hasn&apos;t uploaded any files yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {selectedClient?.name}&apos;s Files ({uploads.length})
            </h2>
          </div>

          <div className="grid gap-3">
            {uploads.map((upload) => (
              <Card key={upload.id} className="hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(upload.mime_type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{upload.filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={categoryColors[upload.category] || categoryColors.other} variant="outline">
                            {upload.category}
                          </Badge>
                          <span className="text-xs text-slate-500">{formatSize(upload.size)}</span>
                          <span className="text-xs text-slate-400">
                            {new Date(upload.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        {upload.notes && (
                          <p className="text-sm text-slate-500 mt-1 truncate">{upload.notes}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(upload.id, upload.filename)}
                      className="ml-4"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { className?: string }) {
  return <label className={className} {...props}>{children}</label>;
}
