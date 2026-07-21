import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Shield, UserCheck, ExternalLink, Calendar } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  title: string;
  avatar: string;
  status: "Active" | "Away" | "Offline";
  contributions: number;
  joinedDate: string;
}

const teamMembers: TeamMember[] = [
  {
    id: "elena-rostova",
    name: "Elena Rostova",
    role: "Project Owner",
    title: "Lead AI Systems Architect",
    avatar: "https://picsum.photos/seed/elena/100/100",
    status: "Active",
    contributions: 142,
    joinedDate: "Jan 2026",
  },
  {
    id: "marcus-chen",
    name: "Marcus Chen",
    role: "Admin",
    title: "Full-Stack Workflow Engineer",
    avatar: "https://picsum.photos/seed/marcus/100/100",
    status: "Active",
    contributions: 98,
    joinedDate: "Feb 2026",
  },
  {
    id: "sarah-jenkins",
    name: "Sarah Jenkins",
    role: "Editor",
    title: "UI/UX & Design Systems Lead",
    avatar: "https://picsum.photos/seed/sarah/100/100",
    status: "Away",
    contributions: 64,
    joinedDate: "Mar 2026",
  },
  {
    id: "alex-mercer",
    name: "Alex Mercer",
    role: "Viewer",
    title: "Data Compliance & Security Auditor",
    avatar: "https://picsum.photos/seed/alex/100/100",
    status: "Offline",
    contributions: 27,
    joinedDate: "Apr 2026",
  },
];

export default function PeopleDirectoryPage({
  params,
}: {
  params: { id: string };
}) {
  const projectId = params.id;

  return (
    <div className="mx-auto w-full px-4 py-8 text-foreground bg-background min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Project Contributors</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage workspace permissions, review collaborator activity, and explore individual profiles.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search people..."
            className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </div>

      {/* Grid of People */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="group relative flex flex-col justify-between rounded-xl bg-card border border-border p-5 shadow-sm hover:border-primary/50 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative h-14 w-14 rounded-full border border-border bg-muted overflow-hidden shrink-0">
                    <Image
                      src={member.avatar}
                      alt={member.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${member.status === "Active"
                        ? "bg-emerald-500"
                        : member.status === "Away"
                          ? "bg-amber-500"
                          : "bg-zinc-500"
                        }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{member.title}</p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                      <Shield className="w-3 h-3" />
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs text-muted-foreground">
                <div>
                  <span className="block font-semibold text-foreground">{member.contributions}</span>
                  <span>Contributions</span>
                </div>
                <div>
                  <span className="block font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {member.joinedDate}
                  </span>
                  <span>Joined Date</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex justify-end">
              <Link
                href={`./people/${member.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                View Profile & Activity
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}