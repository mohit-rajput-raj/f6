import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BookOpen, MessageSquare, GitCommit, Shield, Mail, CheckCircle2 } from "lucide-react";

interface UserProfileData {
    name: string;
    role: string;
    title: string;
    email: string;
    avatar: string;
    bio: string;
    status: string;
    joinedDate: string;
    blogs: { title: string; date: string; readTime: string }[];
    questions: { question: string; answers: number; status: string }[];
    recentActivity: { action: string; timestamp: string }[];
}

// Dummy data lookup based on userId parameter
const mockDatabase: Record<string, UserProfileData> = {
    "elena-rostova": {
        name: "Elena Rostova",
        role: "Project Owner",
        title: "Lead AI Systems Architect",
        email: "elena.rostova@workspace.internal",
        avatar: "https://picsum.photos/seed/elena/150/150",
        bio: "Specializing in distributed LLM agent infrastructures, graph workflow state machines, and real-time execution pipelines.",
        status: "Active",
        joinedDate: "January 2026",
        blogs: [
            { title: "Optimizing Context Windows for Multi-Agent Workflows", date: "May 12, 2026", readTime: "5 min read" },
            { title: "Building Deterministic State Machines in Next.js", date: "Apr 28, 2026", readTime: "8 min read" },
        ],
        questions: [
            { question: "How to handle token rate limits cleanly across clustered worker nodes?", answers: 4, status: "Resolved" },
        ],
        recentActivity: [
            { action: "Updated core pipeline trigger logic in workflow-engine", timestamp: "2 hours ago" },
            { action: "Published documentation article on agent memory structures", timestamp: "Yesterday" },
        ],
    },
    "marcus-chen": {
        name: "Marcus Chen",
        role: "Admin",
        title: "Full-Stack Workflow Engineer",
        email: "marcus.chen@workspace.internal",
        avatar: "https://picsum.photos/seed/marcus/150/150",
        bio: "Focusing on backend architecture, Supabase integration layers, and high-performance UI components.",
        status: "Active",
        joinedDate: "February 2026",
        blogs: [
            { title: "Securing API Keys at Rest with Envelope Encryption", date: "May 04, 2026", readTime: "6 min read" },
        ],
        questions: [
            { question: "Best practices for TanStack Query optimistic caching updates?", answers: 7, status: "Resolved" },
        ],
        recentActivity: [
            { action: "Merged pull request for user billing profile integration", timestamp: "4 hours ago" },
        ],
    },
};

export default function UserProfileSubPage({
    params,
}: {
    params: { id: string; userId: string };
}) {
    const { id: projectId, userId } = params;
    const user = mockDatabase[userId] || mockDatabase["elena-rostova"]; // Fallback safe mock

    return (
        <div className="mx-auto w-full px-4 py-8 text-foreground bg-background min-h-screen">
            {/* Navigation Back */}
            <div className="mb-6">
                <Link
                    href={`/projects/${projectId}/people`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Contributors Directory
                </Link>
            </div>

            {/* User Header Profile Card */}
            <div className="rounded-xl bg-card border border-border p-6 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center space-x-5">
                        <div className="relative h-20 w-20 rounded-full border-2 border-border bg-muted overflow-hidden shrink-0">
                            <Image
                                src={user.avatar}
                                alt={user.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold">{user.name}</h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                    <Shield className="w-3 h-3" />
                                    {user.role}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{user.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                                <Mail className="w-3.5 h-3.5" />
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <div className="bg-muted/50 border border-border rounded-lg p-3 text-xs">
                        <span className="block text-muted-foreground">Member Since</span>
                        <span className="font-semibold">{user.joinedDate}</span>
                    </div>
                </div>

                <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground leading-relaxed">
                    {user.bio}
                </p>
            </div>

            {/* Two Column Content Breakdown (Blogs & Discussions) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Authored Blogs & Articles */}
                <div className="rounded-xl bg-card border border-border p-5">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Authored Articles & Docs
                        </h2>
                        <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full">
                            {user.blogs.length} Published
                        </span>
                    </div>
                    <div className="space-y-3">
                        {user.blogs.map((blog, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                <h3 className="text-xs font-semibold hover:text-primary transition-colors cursor-pointer">
                                    {blog.title}
                                </h3>
                                <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                                    <span>{blog.date}</span>
                                    <span>{blog.readTime}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Questions & Community Q&A */}
                <div className="rounded-xl bg-card border border-border p-5">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                        <h2 className="text-sm font-bold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            Community Q&A
                        </h2>
                        <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full">
                            {user.questions.length} Asked
                        </span>
                    </div>
                    <div className="space-y-3">
                        {user.questions.map((q, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                <p className="text-xs font-semibold">{q.question}</p>
                                <div className="flex items-center justify-between mt-2 text-[10px]">
                                    <span className="text-muted-foreground">{q.answers} replies</span>
                                    <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {q.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity Log Section */}
            <div className="mt-6 rounded-xl bg-card border border-border p-5">
                <h2 className="text-sm font-bold flex items-center gap-2 mb-4 pb-2 border-b border-border">
                    <GitCommit className="w-4 h-4 text-primary" />
                    Recent Workspace Activity
                </h2>
                <div className="space-y-3">
                    {user.recentActivity.map((activity, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-border/40 last:border-0">
                            <span className="text-foreground">{activity.action}</span>
                            <span className="text-muted-foreground shrink-0 ml-4">{activity.timestamp}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}