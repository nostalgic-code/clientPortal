'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { documentsApi, Document } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSignature,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  Printer,
  ScrollText,
  Receipt,
  Video,
  Calendar,
  Package,
  BookOpen,
  BarChart3,
  Users,
  Heart,
  Mail,
} from 'lucide-react';

type DocumentType = 'welcome' | 'agreement' | 'invoice' | 'proposal' | 'strategy_call' | 
  'project_timeline' | 'deliverables' | 'content_guide' | 'monthly_report' | 
  'competitor_analysis' | 'thank_you' | 'letter';

const DOCUMENT_ICONS: Record<DocumentType, React.ReactNode> = {
  welcome: <Mail className="w-8 h-8" />,
  agreement: <ScrollText className="w-8 h-8" />,
  invoice: <Receipt className="w-8 h-8" />,
  proposal: <FileText className="w-8 h-8" />,
  strategy_call: <Video className="w-8 h-8" />,
  project_timeline: <Calendar className="w-8 h-8" />,
  deliverables: <Package className="w-8 h-8" />,
  content_guide: <BookOpen className="w-8 h-8" />,
  monthly_report: <BarChart3 className="w-8 h-8" />,
  competitor_analysis: <Users className="w-8 h-8" />,
  thank_you: <Heart className="w-8 h-8" />,
  letter: <Mail className="w-8 h-8" />,
};

const DOCUMENT_COLORS: Record<DocumentType, string> = {
  welcome: 'bg-green-100 text-green-700 border-green-200',
  agreement: 'bg-purple-100 text-purple-700 border-purple-200',
  invoice: 'bg-blue-100 text-blue-700 border-blue-200',
  proposal: 'bg-amber-100 text-amber-700 border-amber-200',
  strategy_call: 'bg-pink-100 text-pink-700 border-pink-200',
  project_timeline: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  deliverables: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  content_guide: 'bg-orange-100 text-orange-700 border-orange-200',
  monthly_report: 'bg-teal-100 text-teal-700 border-teal-200',
  competitor_analysis: 'bg-red-100 text-red-700 border-red-200',
  thank_you: 'bg-rose-100 text-rose-700 border-rose-200',
  letter: 'bg-slate-100 text-slate-700 border-slate-200',
};

const SIGNABLE_TYPES = ['agreement', 'proposal'];

export default function PublicDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Signing
  const [showSignature, setShowSignature] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDrawing, setSignatureDrawing] = useState('');
  const [signing, setSigning] = useState(false);
  
  // Canvas for signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [token]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.getPublic(token);
      setDocument(res.document);
    } catch (err: any) {
      setError(err.message || 'Document not found');
    } finally {
      setLoading(false);
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  useEffect(() => {
    if (showSignature) {
      setTimeout(initCanvas, 100);
    }
  }, [showSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setSignatureDrawing(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureDrawing('');
  };

  const handleSign = async () => {
    if (!signatureName.trim() || !signatureDrawing) {
      alert('Please enter your name and draw your signature');
      return;
    }
    
    try {
      setSigning(true);
      const res = await documentsApi.signPublic(token, {
        name: signatureName,
        signature: signatureDrawing,
      });
      setDocument(res.document);
      setShowSignature(false);
    } catch (err: any) {
      alert('Failed to sign document: ' + err.message);
    } finally {
      setSigning(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4" />
          <p className="text-slate-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Document Not Found</h2>
            <p className="text-slate-500">
              {error || 'This document may have expired or the link is invalid.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSignable = SIGNABLE_TYPES.includes(document.type) && !document.signed_at;
  const docType = document.type as DocumentType;

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border ${DOCUMENT_COLORS[docType]}`}>
              {DOCUMENT_ICONS[docType]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{document.name}</h1>
              <p className="text-slate-500">
                {formatDate(document.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {document.signed_at ? (
          <Card className="mb-6 border-green-200 bg-green-50 print:hidden">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Document Signed</p>
                  <p className="text-sm text-green-600">
                    Signed by {document.signature_data?.name} on {formatDate(document.signed_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : document.sent_at ? (
          <Card className="mb-6 border-blue-200 bg-blue-50 print:hidden">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Eye className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Document Shared</p>
                  <p className="text-sm text-blue-600">
                    Sent on {formatDate(document.sent_at)}
                    {document.viewed_at && ` • First viewed on ${formatDate(document.viewed_at)}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Document Content */}
        <Card className="mb-6 print:shadow-none print:border-none">
          <CardContent className="p-8">
            <div className="prose prose-slate max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed bg-transparent border-none p-0 m-0">
                {document.content}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        {document.signature_data && (
          <Card className="mb-6 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-green-600" />
                Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <div>
                  <img 
                    src={document.signature_data.signature} 
                    alt="Signature" 
                    className="border rounded bg-white h-24"
                  />
                </div>
                <div className="text-sm text-slate-600">
                  <p><strong>Signed by:</strong> {document.signature_data.name}</p>
                  <p><strong>Date:</strong> {formatDate(document.signature_data.signed_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Button */}
        {isSignable && !showSignature && (
          <div className="text-center print:hidden">
            <Button size="lg" onClick={() => setShowSignature(true)}>
              <FileSignature className="w-5 h-5 mr-2" />
              Sign This Document
            </Button>
            <p className="text-sm text-slate-500 mt-2">
              By signing, you agree to the terms outlined in this document
            </p>
          </div>
        )}

        {/* Signature Panel */}
        {showSignature && (
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                Sign Document
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Full Name</Label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Enter your full legal name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Draw Your Signature</Label>
                <div className="border rounded-lg p-2 bg-white">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="border rounded cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={clearSignature}>
                  Clear Signature
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Legal Notice</p>
                <p>
                  By clicking &quot;Submit Signature&quot;, you confirm that:
                </p>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>You have read and understood this document</li>
                  <li>You agree to its terms and conditions</li>
                  <li>Your electronic signature is legally binding</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowSignature(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSign} 
                  disabled={signing || !signatureName.trim() || !signatureDrawing}
                >
                  {signing ? 'Submitting...' : 'Submit Signature'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-slate-400 mt-8 print:hidden">
          <p>This document was securely shared via Client Portal</p>
        </div>
      </div>
    </div>
  );
}
