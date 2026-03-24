'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { portalApi, Project, Phase } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const POLL_INTERVAL = 10000; // 10 seconds — clients see changes quickly

export default function PortalProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProject = useCallback(async (silent = false) => {
    try {
      const data = await portalApi.getProject();
      setProject(data.project);
      setLastUpdated(new Date());
    } catch (error) {
      if (!silent) console.error('Failed to fetch project:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProject();
    
    // Auto-poll for real-time updates
    pollRef.current = setInterval(() => {
      fetchProject(true);
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchProject]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-700 mb-2">No Active Project</h2>
        <p className="text-slate-500">Your project will appear here once it&apos;s set up.</p>
      </div>
    );
  }

  const phases = project.phases || [];
  const completedPhases = phases.filter((p: any) => p.status === 'completed').length;
  const totalPhases = phases.length;
  
  // Calculate milestone-based progress (more granular)
  const totalMilestones = phases.reduce((sum: number, p: any) => sum + ((p.milestones || []).length), 0);
  const completedMilestones = phases.reduce(
    (sum: number, p: any) => sum + ((p.milestones || []).filter((m: any) => m.status === 'completed').length), 0
  );
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  const activePhase = phases.find((p: any) => p.status === 'active');

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Complete';
      case 'active': return 'In Progress';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Upcoming';
      default: return status;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
          <p className="text-slate-500">Track your project progress and milestones</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => fetchProject()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Project Completed Banner */}
      {project.status === 'completed' && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
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
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Your journey to completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Overall Progress</span>
              <span className="font-semibold text-slate-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
          
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            <span>{completedPhases}/{totalPhases} phases</span>
            <span>·</span>
            <span>{completedMilestones}/{totalMilestones} milestones</span>
          </div>

          {/* Phase indicators */}
          <div className="flex gap-2">
            {phases.map((phase: any, i: number) => (
              <div key={phase.id} className="flex items-center flex-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <div
                        className={`h-2 rounded-full transition-colors ${
                          phase.status === 'completed' ? 'bg-emerald-500' :
                          phase.status === 'active' ? 'bg-blue-500 animate-pulse' :
                          'bg-slate-200'
                        }`}
                      />
                      <p className="text-xs text-slate-500 mt-1.5 truncate">{phase.name}</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {phase.name} — {getStatusLabel(phase.status)}
                    {phase.milestones && (
                      <span className="block text-xs opacity-75">
                        {phase.milestones.filter((m: any) => m.status === 'completed').length}/{phase.milestones.length} milestones
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
                {i < phases.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 mx-0.5 flex-shrink-0 mt-[-18px]" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Phase Detail */}
      {activePhase && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <CardTitle>Current Phase: {(activePhase as any).name}</CardTitle>
            </div>
            <CardDescription>
              {((activePhase as any).milestones || []).filter((m: any) => m.status === 'completed').length} of{' '}
              {((activePhase as any).milestones || []).length} milestones complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {((activePhase as any).milestones || []).map((milestone: any) => (
                <div
                  key={milestone.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    milestone.status === 'completed' ? 'bg-green-50/50 border-green-100' :
                    milestone.status === 'in_progress' ? 'bg-white border-blue-200 shadow-sm' :
                    'bg-white border-slate-100'
                  }`}
                >
                  {milestone.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : milestone.status === 'in_progress' ? (
                    <div className="relative">
                      <Circle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <Lock className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={
                      milestone.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700 font-medium'
                    }>
                      {milestone.title}
                    </span>
                    {milestone.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{milestone.description}</p>
                    )}
                    {milestone.completed_at && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Done {new Date(milestone.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {milestone.status === 'in_progress' && (
                    <Badge variant="default" className="ml-auto bg-blue-100 text-blue-700 border-blue-200 whitespace-nowrap">
                      In Progress
                    </Badge>
                  )}
                  {milestone.status === 'completed' && (
                    <Badge variant="outline" className="ml-auto text-emerald-600 border-emerald-200 whitespace-nowrap">
                      Done
                    </Badge>
                  )}
                  {milestone.status === 'pending' && (
                    <Badge variant="outline" className="ml-auto text-slate-400 border-slate-200 whitespace-nowrap">
                      Upcoming
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Phases */}
      <Card>
        <CardHeader>
          <CardTitle>Project Timeline</CardTitle>
          <CardDescription>All phases of your project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {phases.map((phase: any) => (
              <div
                key={phase.id}
                className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                  phase.status === 'active' ? 'bg-blue-50 border border-blue-200' :
                  phase.status === 'completed' ? 'bg-emerald-50 border border-emerald-100' :
                  'bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {phase.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : phase.status === 'active' ? (
                    <Clock className="w-6 h-6 text-blue-500" />
                  ) : (
                    <Lock className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{phase.name}</h3>
                    <Badge
                      variant={
                        phase.status === 'completed' ? 'default' :
                        phase.status === 'active' ? 'default' : 'outline'
                      }
                      className={
                        phase.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        phase.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        ''
                      }
                    >
                      {getStatusLabel(phase.status)}
                    </Badge>
                  </div>
                  {phase.milestones && phase.milestones.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{phase.milestones.filter((m: any) => m.status === 'completed').length} of {phase.milestones.length} milestones complete</span>
                      </div>
                      {/* Mini milestone progress bar */}
                      <div className="flex gap-1 mt-2">
                        {phase.milestones.map((m: any) => (
                          <div
                            key={m.id}
                            className={`h-1.5 flex-1 rounded-full ${
                              m.status === 'completed' ? 'bg-emerald-400' :
                              m.status === 'in_progress' ? 'bg-blue-400 animate-pulse' :
                              'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {phase.description && (
                    <p className="mt-1 text-sm text-slate-500">{phase.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
