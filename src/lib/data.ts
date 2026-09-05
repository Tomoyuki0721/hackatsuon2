import fs from "node:fs";
import path from "node:path";
import type { ProjectData } from "@/types/project";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

export interface ProjectSummary {
  projectId: string;
  canonicalName: string;
  department: string;
  budgetCategory: string;
  policyCategory: string;
}

/** ビルド時に data/projects/*.json を全件読み込む(サーバー専用、クライアントから直接呼ばない)。 */
export function getAllProjectIds(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function getProjectData(projectId: string): ProjectData | null {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProjectData;
}

/** 全事業データ。ビルド時にトップページの横断分析で使う。 */
export function getAllProjects(): ProjectData[] {
  return getAllProjectIds()
    .map((id) => getProjectData(id))
    .filter((p): p is ProjectData => p !== null);
}

export function getAllProjectSummaries(): ProjectSummary[] {
  return getAllProjectIds()
    .map((id) => getProjectData(id))
    .filter((p): p is ProjectData => p !== null)
    .map((p) => ({
      projectId: p.master.projectId,
      canonicalName: p.master.canonicalName,
      department: p.master.department,
      budgetCategory: p.master.budgetCategory,
      policyCategory: p.master.policyCategory,
    }));
}
