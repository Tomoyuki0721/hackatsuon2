import fs from "node:fs";
import path from "node:path";
import type { ProjectData } from "@/types/project";
import type { CouncilQa } from "@/types/council";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");
const COUNCIL_FILE = path.join(process.cwd(), "data", "council", "qa.json");

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

/** 議会の質疑応答。ファイルが無ければ空配列(未整備の状態でも画面が壊れないようにする)。 */
export function getCouncilQa(): CouncilQa[] {
  if (!fs.existsSync(COUNCIL_FILE)) return [];
  return JSON.parse(fs.readFileSync(COUNCIL_FILE, "utf-8")) as CouncilQa[];
}

/** 指定した事業に紐づく質疑を、新しい号が先に来る順で返す。 */
export function getCouncilQaForProject(projectId: string): CouncilQa[] {
  return getCouncilQa()
    .filter((qa) => qa.relatedProjectIds.includes(projectId))
    .sort((a, b) => Number(b.issue) - Number(a.issue));
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
