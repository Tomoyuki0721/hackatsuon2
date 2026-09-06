import { notFound } from "next/navigation";
import { getAllProjectIds, getCouncilQaForProject, getProjectData } from "@/lib/data";
import { ProjectPageClient } from "@/components/ProjectPageClient";

export function generateStaticParams() {
  return getAllProjectIds().map((projectId) => ({ projectId }));
}

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const data = getProjectData(params.projectId);
  if (!data) notFound();

  return <ProjectPageClient data={data} councilQa={getCouncilQaForProject(params.projectId)} />;
}
