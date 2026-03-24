'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, FolderKanban, FileText, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { clientsApi, projectsApi, proposalsApi, invoicesApi, Client, Project, Proposal, Invoice } from '@/lib/api';
import { getToken } from '@/lib/supabase';

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken();
      console.log('[Dashboard] Supabase token:', token ? 'present' : 'null');
      if (!token) return;

      try {
        const [clientsRes, projectsRes, proposalsRes, invoicesRes] = await Promise.all([
          clientsApi.list(token),
          projectsApi.list(token),
          proposalsApi.list(token),
          invoicesApi.list(token),
        ]);

        setClients(clientsRes.clients);
        setProjects(projectsRes.projects);
        setProposals(proposalsRes.proposals);
        setInvoices(invoicesRes.invoices);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      title: 'Total Clients',
      value: clients.length,
      description: `${clients.filter(c => c.status === 'active').length} active`,
      icon: Users,
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Active Projects',
      value: projects.filter(p => p.status === 'active').length,
      description: `${projects.length} total`,
      icon: FolderKanban,
      trend: '+5%',
      trendUp: true,
    },
    {
      title: 'Pending Proposals',
      value: proposals.filter(p => p.status === 'sent').length,
      description: `${proposals.filter(p => p.status === 'accepted').length} accepted`,
      icon: FileText,
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Unpaid Invoices',
      value: invoices.filter(i => i.status === 'sent' || i.status === 'overdue').length,
      description: `R${invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((sum, i) => sum + (i.total || i.subtotal || 0), 0).toLocaleString()}`,
      icon: Receipt,
      trend: '+8%',
      trendUp: false,
    },
  ];

  const recentProjects = projects.slice(0, 5);
  const pendingProposals = proposals.filter(p => p.status === 'sent').slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here&apos;s an overview of your business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">{stat.description}</span>
                <span className={`flex items-center text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your latest active projects</CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">No projects yet</p>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">{project.client?.name}</p>
                    </div>
                    <Badge variant={project.status === 'active' ? 'success' : project.status === 'completed' ? 'secondary' : 'outline'}>
                      {project.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Proposals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Proposals</CardTitle>
            <CardDescription>Awaiting client response</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingProposals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending proposals</p>
            ) : (
              <div className="space-y-4">
                {pendingProposals.map((proposal) => (
                  <div key={proposal.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{proposal.client?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R{proposal.total_amount?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Badge variant="warning">Sent</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
