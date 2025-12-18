"use client";

import { useState, useEffect } from "react";
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
import { useRouter } from "next/navigation";
import { useRouteAuthContextHook } from "@/context/routeContext";

type Project = {
  Name: string;
  Percentage: number;
  Present_Count: number;
  TotalClasses: number;
};

export default function ProjectList({ data }: { data: Project[] } ) {
  const [projects, setProjects] = useState<Project[]>([]);
  const { setDashid } = useRouteAuthContextHook();

  useEffect(() => {
    if (data) {
      setProjects(data);
    }
  }, [data]);

  const route = useRouter();

  const handelR = (i: number) => {
    setDashid(String(i));
    window.open(`/dashboard/dash/${i}/editor`, "_blank");
  };

  return (
    <div className="space-y-4 p-10">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Total Present</TableHead>
            <TableHead>Total Classes</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {projects?.map((project, i) => (
            <TableRow
              key={i}
              className="cursor-pointer"
            //   onClick={() => handelR(i)}
            >
              <TableCell className="font-semibold">{project.Name}</TableCell>
              <TableCell>{project.Present_Count}</TableCell>
              <TableCell>{project.TotalClasses}</TableCell>
              <TableCell>{project.Percentage}</TableCell>

              {/* <TableCell className="text-right">
                <Button variant="ghost" className="gap-1">
                  Add <Plus size={16} />
                </Button>
              </TableCell> */}

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
    </div>
  );
}
