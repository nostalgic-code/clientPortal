'use client';

import { useEffect, useState } from 'react';
import { Building2, User as UserIcon, Shield, Calendar, Users, FolderKanban, Briefcase, Save, Loader2, Mail, Phone, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { organizationApi, User, Organization } from '@/lib/api';
import { getSession } from '@/lib/supabase';

interface OrgStats {
  members: number;
  clients: number;
  projects: number;
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgStats>({ members: 0, clients: 0, projects: 0 });
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Org form state
  const [orgName, setOrgName] = useState('');
  const [isSavingOrg, setIsSavingOrg] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const session = await getSession();
      if (!session) return;
      const token = session.access_token;

      const [orgRes, profileRes] = await Promise.all([
        organizationApi.get(token),
        organizationApi.getProfile(token),
      ]);

      setOrganization(orgRes.organization);
      setStats(orgRes.stats);
      setOrgName(orgRes.organization.name);

      setProfile(profileRes.profile);
      setProfileName(profileRes.profile.name || '');
      setProfilePhone(profileRes.profile.phone || '');
      setProfileCompany(profileRes.profile.company_name || '');
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!orgName.trim()) return;
    setIsSavingOrg(true);
    setOrgSaved(false);
    try {
      const session = await getSession();
      if (!session) return;
      const res = await organizationApi.update(session.access_token, { name: orgName.trim() });
      setOrganization(res.organization);
      setOrgSaved(true);
      setTimeout(() => setOrgSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update organization:', err);
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaved(false);
    try {
      const session = await getSession();
      if (!session) return;
      const res = await organizationApi.updateProfile(session.access_token, {
        name: profileName.trim(),
        phone: profilePhone.trim(),
        company_name: profileCompany.trim(),
      });
      setProfile(res.profile);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization and profile settings
        </p>
      </div>

      {/* Organization Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Organization</h2>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.members}</p>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.clients}</p>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.projects}</p>
                  <p className="text-sm text-muted-foreground">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Your organization is isolated — only members of this organization can access its data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your organization name"
                />
              </div>
              <div className="space-y-2">
                <Label>Organization ID</Label>
                <Input value={organization?.id || ''} disabled className="font-mono text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Owner</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                  <span className="text-sm text-muted-foreground">{profile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Created</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {organization?.created_at
                    ? new Date(organization.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSaveOrg} disabled={isSavingOrg || !orgName.trim()}>
                {isSavingOrg ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Organization
              </Button>
              {orgSaved && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Profile Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Your Profile</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details. Your email is managed through authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profileName">Full Name</Label>
                <Input
                  id="profileName"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="profileEmail"
                    value={profile?.email || ''}
                    disabled
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Phone</Label>
                <div className="relative">
                  <Phone className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="profilePhone"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profileCompany">Company Name</Label>
                <div className="relative">
                  <Building className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="profileCompany"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="Your company"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <div>
                  <Badge>{profile?.role || 'admin'}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Profile
              </Button>
              {profileSaved && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Isolation Notice */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Organization Data Isolation</p>
              <p className="text-sm text-muted-foreground mt-1">
                All data in this portal (clients, projects, proposals, documents, invoices) is scoped to your
                organization. No other organization can access your data, and you cannot access theirs.
                Every API request is verified against your organization membership.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
