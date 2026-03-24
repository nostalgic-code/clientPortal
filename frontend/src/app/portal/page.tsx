'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Receipt,
  Upload,
  FolderKanban,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { portalApi, PortalClient, PortalProjectSummary, PortalStats } from '@/lib/api';

export default function PortalDashboardPage() {
  const [client, setClient] = useState<PortalClient | null>(null);
  const [project, setProject] = useState<PortalProjectSummary | null>(null);
  const [stats, setStats] = useState<PortalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await portalApi.getDashboard();
        setClient(data.client);
        setProject(data.project);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back, {client?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s an overview of your project and tasks.
        </p>
      </div>

      {/* Project Progress Card */}
      {project ? (
        <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Project</p>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{project.name}</h2>
              </div>
              <Badge
                variant={project.status === 'active' ? 'default' : 'outline'}
                className={project.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
              >
                {project.status === 'active' ? 'In Progress' : project.status}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Overall Progress</span>
                <span className="font-semibold text-slate-900">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2.5" />
              {project.active_phase && (
                <p className="text-sm text-slate-500 mt-2">
                  Currently in: <span className="font-medium text-slate-700">{project.active_phase}</span>
                </p>
              )}
            </div>
            <Link href="/portal/project" className="inline-block mt-4">
              <Button variant="outline" size="sm">
                View Project Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-700">No Active Project</h3>
            <p className="text-slate-500 text-sm mt-1">Your project will appear here once it&apos;s set up.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Link href="/portal/proposals" className="group">
            <Card className="transition-all hover:shadow-md hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-violet-50 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-violet-600" />
                  </div>
                  {stats.pending_proposals > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.pending_proposals} pending
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_proposals}</p>
                <p className="text-sm text-slate-500">Proposals</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/documents" className="group">
            <Card className="transition-all hover:shadow-md hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  {stats.pending_documents > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.pending_documents} pending
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_documents}</p>
                <p className="text-sm text-slate-500">Documents</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/invoices" className="group">
            <Card className="transition-all hover:shadow-md hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Receipt className="w-5 h-5 text-amber-600" />
                  </div>
                  {stats.unpaid_invoices > 0 && (
                    <Badge variant="warning" className="text-xs">
                      {stats.unpaid_invoices} unpaid
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_invoices}</p>
                <p className="text-sm text-slate-500">Invoices</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/uploads" className="group">
            <Card className="transition-all hover:shadow-md hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Upload className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.uploads}</p>
                <p className="text-sm text-slate-500">Uploads</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/portal/project" className="group">
            <Card className="transition-all hover:shadow-md hover:border-slate-300 cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <FolderKanban className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{project?.progress ?? 0}%</p>
                <p className="text-sm text-slate-500">Progress</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Action Items */}
      {stats && (stats.pending_proposals > 0 || stats.pending_documents > 0 || stats.unpaid_invoices > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pending_proposals > 0 && (
              <Link href="/portal/proposals" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-violet-600" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {stats.pending_proposals} proposal{stats.pending_proposals > 1 ? 's' : ''} awaiting your response
                      </p>
                      <p className="text-sm text-slate-500">Review and accept or decline</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-violet-600" />
                </div>
              </Link>
            )}

            {stats.pending_documents > 0 && (
              <Link href="/portal/documents" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {stats.pending_documents} document{stats.pending_documents > 1 ? 's' : ''} awaiting review
                      </p>
                      <p className="text-sm text-slate-500">View and sign your documents</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                </div>
              </Link>
            )}

            {stats.unpaid_invoices > 0 && (
              <Link href="/portal/invoices" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {stats.unpaid_invoices} invoice{stats.unpaid_invoices > 1 ? 's' : ''} outstanding
                      </p>
                      <p className="text-sm text-slate-500">Review and pay your invoices</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-600" />
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/portal/uploads">
          <Card className="hover:shadow-md transition-all cursor-pointer border-dashed hover:border-solid h-full">
            <CardContent className="p-6 text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900">Upload Files</h3>
              <p className="text-sm text-slate-500 mt-1">
                Share logos, content & assets
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/documents">
          <Card className="hover:shadow-md transition-all cursor-pointer border-dashed hover:border-solid h-full">
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900">View Documents</h3>
              <p className="text-sm text-slate-500 mt-1">
                Agreements, reports & more
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/project">
          <Card className="hover:shadow-md transition-all cursor-pointer border-dashed hover:border-solid h-full">
            <CardContent className="p-6 text-center">
              <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h3 className="font-medium text-slate-900">Track Progress</h3>
              <p className="text-sm text-slate-500 mt-1">
                Phases, milestones & timeline
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
