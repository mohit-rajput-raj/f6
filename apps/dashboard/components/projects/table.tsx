"use client";

import { useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import { Input } from "@repo/ui/components/ui/input";
import { useRouter } from "next/navigation";
import { useRouteAuthContextHook } from "@/context/routeContext";

type Project = {
  name: string;
  createdAt: string;
  lastActive: string;
  branches: number;
};

export default  function ProjectList() {
  const [search, setSearch] = useState("");
    const {setDashid}=useRouteAuthContextHook();
  const [projects, setProjects] = useState<Project[]>([
    {
      name: "new3",
      createdAt: "Oct 26, 2025 9:36 pm",
      lastActive: "Nov 18, 2025 1:16 pm",
      branches: 2,
    },
    {
      name: "dbms",
      createdAt: "Oct 2, 2025 7:09 pm",
      lastActive: "Oct 26, 2025 9:35 pm",
      branches: 2,
    },
    {
      name: "theEnd",
      createdAt: "Sep 26, 2025 11:38 pm",
      lastActive: "Oct 3, 2025 11:44 pm",
      branches: 2,
    },
  ]);

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addProject = () => {
    const newName = window.prompt("Enter project name:");
    if (!newName) return;

    setProjects([
      ...projects,
      {
        name: newName,
        createdAt: new Date().toLocaleString(),
        lastActive: "-",
        branches: 1,
      },
    ]);
  };
  const route = useRouter();
  // const handelroute = ()=>{
  //   route.push(`/dashboard/dash/${i}/editor`)}
  // }

  const handelR = ({i}:{i:number})=>{
    setDashid(String(i));
    window.open(`/dashboard/dash/${i}/editor` , "_blank")
  }
  return (
    <div className="space-y-4 p-10">
      <Button onClick={addProject} className="mt-2">
        Add New Project
      </Button>
      {/* Search Input */}
      <Input
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-3"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created at</TableHead>
            <TableHead>Compute last active</TableHead>
            <TableHead>Branches</TableHead>
            <TableHead className="text-right">Integrations</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered.map((project , i) => (
            <TableRow key={project.name} className="cursor-pointer" onClick={()=>handelR({i})}>
              <TableCell className="font-semibold">{project.name}</TableCell>
              <TableCell>{project.createdAt}</TableCell>
              <TableCell>{project.lastActive}</TableCell>
              <TableCell>{project.branches}</TableCell>

              {/* Add + */}
              <TableCell className="text-right">
                <Button variant="ghost" className="gap-1">
                  Add <Plus size={16} />
                </Button>
              </TableCell>

              {/* 3-dot menu */}
              <TableCell className="w-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-500">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add project button at bottom */}
      
    </div>
  );
}
