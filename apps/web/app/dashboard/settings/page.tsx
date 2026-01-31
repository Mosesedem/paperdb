"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Home,
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  Globe,
  Zap,
  Building2,
  Rocket,
  ExternalLink,
} from "lucide-react";
import Ttile from "@/components/ttile";
import { authClient } from "@/app/lib/auth-client";

interface UsageData {
  plan: string;
  databases: { current: number; limit: number };
  collections: { current: number; limit: number };
  documents: { current: number; limit: number };
  apiRequests: { current: number; limit: number };
  storage: { current: number; limit: number };
  realtimeEnabled: boolean;
  subscription?: {
    status: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  };
}

const planDetails = {
  free: {
    name: "Free",
    description: "Perfect for getting started",
    icon: Rocket,
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
  },
  pro: {
    name: "Pro",
    description: "For growing projects",
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  team: {
    name: "Team",
    description: "For larger teams",
    icon: Building2,
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
};

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sessionData } = await authClient.getSession();
        setSession(sessionData);

        // Fetch usage data
        const response = await fetch("/api/usage");
        if (response.ok) {
          const usageData = await response.json();
          setUsage(usageData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const currentPlan = usage?.plan || "free";
  const planInfo =
    planDetails[currentPlan as keyof typeof planDetails] || planDetails.free;
  const PlanIcon = planInfo.icon;

  const formatNumber = (num: number) => num.toLocaleString();
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getPercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <>
      <Ttile>Settings - PaperDB</Ttile>
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="flex flex-row items-center">
            <img src="/logo.png" className="w-8" />
            <p className="text-lg font-semibold">PaperDB</p>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    Databases
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <div className="p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-gray-400 mt-2">
                Manage your account settings and preferences
              </p>
            </header>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="profile"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Billing & Usage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        defaultValue={session?.user?.name || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@example.com"
                        defaultValue={session?.user?.email || ""}
                        disabled
                      />
                    </div>
                    <Button>Save Changes</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-400">
                          Receive email notifications about your databases
                        </p>
                      </div>
                      <Switch
                        checked={notifications}
                        onCheckedChange={setNotifications}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Communications</Label>
                        <p className="text-sm text-gray-400">
                          Receive updates about new features and products
                        </p>
                      </div>
                      <Switch
                        checked={marketing}
                        onCheckedChange={setMarketing}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!hasPassword && (
                      <div className="p-4 bg-blue-900/20 border border-blue-700/30 rounded-md">
                        <p className="text-sm text-blue-300">
                          You don't have a password set. You can only sign in
                          with your email provider.
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        disabled={!hasPassword}
                        placeholder={
                          hasPassword
                            ? "Enter current password"
                            : "No password set"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        disabled={!hasPassword}
                        placeholder={
                          hasPassword ? "Enter new password" : "No password set"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        disabled={!hasPassword}
                        placeholder={
                          hasPassword
                            ? "Confirm new password"
                            : "No password set"
                        }
                      />
                    </div>
                    <Button variant="outline" disabled={!hasPassword}>
                      Change Password
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Current Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${planInfo.bgColor}`}
                        >
                          <PlanIcon className={`w-5 h-5 ${planInfo.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {planInfo.name} Plan
                          </h3>
                          <p className="text-sm text-gray-400">
                            {planInfo.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Current</Badge>
                    </div>

                    {usage?.subscription?.status === "canceled" &&
                      usage?.subscription?.currentPeriodEnd && (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-md">
                          <p className="text-sm text-yellow-300">
                            Your subscription will end on{" "}
                            {new Date(
                              usage.subscription.currentPeriodEnd,
                            ).toLocaleDateString()}
                            . You'll be downgraded to the Free plan after this
                            date.
                          </p>
                        </div>
                      )}

                    <Separator />

                    {loading ? (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-full"></div>
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ) : (
                      usage && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Databases</span>
                            <span>
                              {formatNumber(usage.databases.current)} /{" "}
                              {usage.databases.limit === -1
                                ? "Unlimited"
                                : formatNumber(usage.databases.limit)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Documents</span>
                            <span>
                              {formatNumber(usage.documents.current)} /{" "}
                              {usage.documents.limit === -1
                                ? "Unlimited"
                                : formatNumber(usage.documents.limit)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Realtime Subscriptions</span>
                            <span
                              className={
                                usage.realtimeEnabled
                                  ? "text-green-400"
                                  : "text-gray-500"
                              }
                            >
                              {usage.realtimeEnabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                      )
                    )}

                    {currentPlan === "free" ? (
                      <Link href="/pricing">
                        <Button className="w-full bg-blue-500 hover:bg-blue-600">
                          <Zap className="w-4 h-4 mr-2" />
                          Upgrade Plan
                        </Button>
                      </Link>
                    ) : (
                      <div className="flex gap-2">
                        <Link href="/pricing" className="flex-1">
                          <Button variant="outline" className="w-full">
                            Change Plan
                          </Button>
                        </Link>
                        <Button variant="ghost" className="text-gray-400">
                          Manage Subscription
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage This Month</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-8 bg-gray-700 rounded w-full"></div>
                        <div className="h-8 bg-gray-700 rounded w-full"></div>
                      </div>
                    ) : (
                      usage && (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>API Requests</span>
                              <span>
                                {formatNumber(usage.apiRequests.current)} /{" "}
                                {usage.apiRequests.limit === -1
                                  ? "Unlimited"
                                  : formatNumber(usage.apiRequests.limit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getProgressColor(getPercentage(usage.apiRequests.current, usage.apiRequests.limit))}`}
                                style={{
                                  width: `${getPercentage(usage.apiRequests.current, usage.apiRequests.limit)}%`,
                                }}
                              ></div>
                            </div>
                            {getPercentage(
                              usage.apiRequests.current,
                              usage.apiRequests.limit,
                            ) >= 80 && (
                              <p className="text-xs text-yellow-400">
                                You're approaching your API request limit.
                                Consider upgrading.
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Storage Used</span>
                              <span>
                                {formatBytes(usage.storage.current)} /{" "}
                                {usage.storage.limit === -1
                                  ? "Unlimited"
                                  : formatBytes(usage.storage.limit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getProgressColor(getPercentage(usage.storage.current, usage.storage.limit))}`}
                                style={{
                                  width: `${getPercentage(usage.storage.current, usage.storage.limit)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </>
                      )
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentPlan === "free" ? (
                      <div className="text-center py-8 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No billing history yet</p>
                        <p className="text-sm">
                          Your invoices will appear here once you upgrade to a
                          paid plan
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">
                          Billing is managed through Polar. Click below to view
                          invoices.
                        </p>
                        <Button variant="outline" className="mt-4">
                          View Invoices
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentPlan === "free" ? (
                      <div className="text-center py-8 text-gray-400">
                        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No payment method added</p>
                        <p className="text-sm">
                          Add a payment method when you upgrade your plan
                        </p>
                        <Link href="/pricing">
                          <Button variant="outline" className="mt-4">
                            View Plans
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">
                          Payment method is managed through Polar.
                        </p>
                        <Button variant="outline" className="mt-4">
                          Update Payment Method
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
