import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAllProjectIds, getProjectData } from "@/lib/data";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectView } from "@/components/ProjectView";

export function generateStaticParams() {
  return getAllProjectIds().map((projectId) => ({ projectId }));
}

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const data = getProjectData(params.projectId);
  if (!data) notFound();

  return (
    <AppShell currentProjectId={params.projectId} defaultProjectId={params.projectId}>
      <Suspense fallback={null}>
        <ProjectView data={data} />
      </Suspense>
    </AppShell>
  );
}
