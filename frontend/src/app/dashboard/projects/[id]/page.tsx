'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Lock,
  Play,
  Pause,
  Zap,
  ChevronRight,
  Timer,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { projectsApi, Project, Phase, Milestone } from '@/lib/api';
import { getToken } from '@/lib/supabase';

const POLL_INTERVAL = 15000; // 15 seconds

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [completingMilestone, setCompletingMilestone] = useState<string | null>(null);
  const { toast } = useToast();
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const projectId = params.id as string;

  const fetchProject = useCallback(async (silent = false) => {
    const token = await getToken();
    if (!token) return;

    try {
      const data = await projectsApi.get(token, projectId);
      setProject(data.project);
    } catch (error) {
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to fetch project',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchProject();
    
    // Auto-poll every 15 seconds for real-time updates
    pollRef.current = setInterval(() => {
      fetchProject(true);
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchProject]);

  const handleCompleteMilestone = async (milestoneId: string, milestoneTitle: string) => {
    const token = await getToken();
    if (!token) return;

    setCompletingMilestone(milestoneId);
    try {
      const data = await projectsApi.completeMilestone(token, projectId, milestoneId);
      
      // Update project from response
      setProject(data.project);
      
      const cascade = data.cascade || {};
      let description = `"${milestoneTitle}" has been completed.`;
      if (cascade.next_milestone) {
        description += ` Next up: "${cascade.next_milestone}"`;
      }
      if (cascade.phase_completed && cascade.next_phase) {
        description += ` Phase completed! Moving to "${cascade.next_phase}"`;
      }
      if (cascade.project_completed) {
        description = `"${milestoneTitle}" completed. All phases done — project is complete! 🎉`;
      }

      toast({ title: 'Milestone completed!', description });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete milestone',
        variant: 'destructive',
      });
    } finally {
      setCompletingMilestone(null);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    const token = await getToken();
    if (!token) return;

    try {
      await projectsApi.updateStatus(token, projectId, status);
      toast({
        title: 'Status updated',
        description: `Project is now ${status}`,
      });
      fetchProject();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'active':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Lock className="w-5 h-5 text-slate-300" />;
    }
  };

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-blue-500" />;
      default:
        return <Lock className="w-5 h-5 text-slate-300" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'Active';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

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

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const phases = project.phases || [];
  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const totalPhases = phases.length;

  // Calculate milestone-based progress (more granular than phase-based)
  const totalMilestones = phases.reduce((sum, p) => sum + (p.milestones?.length || 0), 0);
  const completedMilestones = phases.reduce(
    (sum, p) => sum + (p.milestones?.filter(m => m.status === 'completed').length || 0), 0
  );
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Find current active phase and milestone
  const activePhase = phases.find(p => p.status === 'active');
  const activeMilestone = activePhase?.milestones?.find(m => m.status === 'in_progress');

  return (
    <TooltipProvider delayDuration={300}>
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Go back</TooltipContent>
        </Tooltip>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-600">{project.client?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => fetchProject()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh project data</TooltipContent>
          </Tooltip>
          {project.status === 'active' && (
            <Button variant="outline" onClick={() => handleUpdateStatus('paused')}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          {project.status === 'paused' && (
            <Button onClick={() => handleUpdateStatus('active')}>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Badge 
            variant={
              project.status === 'active' ? 'default' : 
              project.status === 'completed' ? 'secondary' : 'outline'
            }
            className={
              project.status === 'active' ? 'bg-green-100 text-green-700' :
              project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-amber-100 text-amber-700'
            }
          >
            {project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'Paused'}
          </Badge>
        </div>
      </div>

      {/* Currently Working On — prominent banner */}
      {activePhase && activeMilestone && project.status === 'active' && (
        <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Currently Working On</p>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{activeMilestone.title}</h3>
                {activeMilestone.description && (
                  <p className="text-sm text-slate-600 mb-3">{activeMilestone.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5" />
                    <span>Phase: {activePhase.name}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => handleCompleteMilestone(activeMilestone.id, activeMilestone.title)}
                    disabled={completingMilestone === activeMilestone.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {completingMilestone === activeMilestone.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Completed Banner */}
      {project.status === 'completed' && (
        <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-green-800">Project Completed!</h3>
                <p className="text-sm text-green-600">All phases and milestones have been completed successfully.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold">{progress}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phases Completed</p>
              <p className="text-2xl font-bold">{completedPhases} / {totalPhases}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Milestones Done</p>
              <p className="text-2xl font-bold">{completedMilestones} / {totalMilestones}</p>
            </div>
          </div>
          <Progress value={progress} className="h-3" />

          {/* Phase progress strip */}
          {totalPhases > 0 && (
            <div className="flex items-center gap-1 mt-4">
              {phases.map((phase, i) => (
                <div key={phase.id} className="flex items-center flex-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex-1 h-2 rounded-full transition-colors cursor-default ${
                        phase.status === 'completed' ? 'bg-green-500' :
                        phase.status === 'active' ? 'bg-blue-500 animate-pulse' :
                        'bg-slate-200'
                      }`} />
                    </TooltipTrigger>
                    <TooltipContent>{phase.name} — {getStatusLabel(phase.status)}</TooltipContent>
                  </Tooltip>
                  {i < totalPhases - 1 && <ChevronRight className="w-3 h-3 text-slate-300 mx-0.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phases */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Project Phases</h2>
        
        {phases.map((phase, index) => (
          <Card key={phase.id} className={phase.status === 'active' ? 'border-blue-200 bg-blue-50/50' : ''}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getPhaseIcon(phase.status)}
                <div className="flex-1">
                  <CardTitle className="text-lg">{phase.name}</CardTitle>
                  <CardDescription>
                    Phase {index + 1}
                    {phase.milestones && phase.milestones.length > 0 && (
                      <span className="ml-2">
                        · {phase.milestones.filter(m => m.status === 'completed').length}/{phase.milestones.length} milestones
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Badge 
                  className={
                    phase.status === 'completed' ? 'bg-green-100 text-green-700' :
                    phase.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }
                >
                  {getStatusLabel(phase.status)}
                </Badge>
              </div>
            </CardHeader>
            
            {phase.milestones && phase.milestones.length > 0 && (
              <CardContent>
                <div className="space-y-3">
                  {phase.milestones.map((milestone) => (
                    <div key={milestone.id} className={`border rounded-lg p-4 transition-colors ${
                      milestone.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' :
                      milestone.status === 'completed' ? 'border-green-100 bg-green-50/30' :
                      ''
                    }`}>
                      <div className="flex items-center gap-3">
                        {getMilestoneIcon(milestone.status)}
                        <div className="flex-1">
                          <p className={`font-medium ${milestone.status === 'completed' ? 'text-slate-400 line-through' : ''}`}>
                            {milestone.title}
                          </p>
                          {milestone.description && (
                            <p className="text-sm text-muted-foreground">{milestone.description}</p>
                          )}
                          {milestone.completed_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Completed {new Date(milestone.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          }>
                            {getStatusLabel(milestone.status)}
                          </Badge>
                          {milestone.status === 'in_progress' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteMilestone(milestone.id, milestone.title)}
                                  disabled={completingMilestone === milestone.id}
                                >
                                  {completingMilestone === milestone.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Complete
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Mark this milestone as done</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
    </TooltipProvider>
  );
}
