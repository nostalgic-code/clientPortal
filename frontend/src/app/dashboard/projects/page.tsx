'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FolderKanban, ChevronRight, Clock, CheckCircle2, PauseCircle } from 'lucide-react';
import { projectsApi, Project } from '@/lib/api';
import { getToken } from '@/lib/supabase';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(projects.filter(p => p.status === statusFilter));
    }
  }, [projects, statusFilter]);

  const fetchProjects = async () => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await projectsApi.list(token);
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <PauseCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateProgress = (project: Project): number => {
    if (!project.phases || project.phases.length === 0) return 0;
    const totalMilestones = project.phases.reduce((sum, p) => sum + ((p.milestones || []).length), 0);
    const completedMilestones = project.phases.reduce(
      (sum, p) => sum + ((p.milestones || []).filter(m => m.status === 'completed').length), 0
    );
    return totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-600">Track and manage all your client projects</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-muted-foreground">Projects are created when clients accept proposals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => {
            const progress = calculateProgress(project);
            const activePhase = project.phases?.find(p => p.status === 'active');
            
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardDescription>{project.client?.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>

                      {/* Current Phase */}
                      {activePhase && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current Phase</span>
                          <span className="font-medium">{activePhase.name}</span>
                        </div>
                      )}

                      {/* Phases */}
                      {project.phases && project.phases.length > 0 && (
                        <div className="flex gap-1">
                          {project.phases.map((phase, index) => (
                            <div
                              key={phase.id}
                              className={`h-2 flex-1 rounded ${
                                phase.status === 'completed'
                                  ? 'bg-green-500'
                                  : phase.status === 'active'
                                  ? 'bg-blue-500'
                                  : 'bg-slate-200'
                              }`}
                              title={phase.name}
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end pt-2">
                        <span className="text-sm text-muted-foreground flex items-center">
                          View Details <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
