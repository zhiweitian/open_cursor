import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { workspace } from "./workspace.ts";

type Skill = { name: string; description: string; path: string };

function parseFrontmatter(raw: string) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { name: "", description: "" };
  let name = "";
  let description = "";
  for (const line of m[1].split("\n")) {
    if (line.startsWith("name:")) name = line.slice(5).trim();
    if (line.startsWith("description:")) description = line.slice(12).trim().replace(/^['"]|['"]$/g, "");
  }
  return { name, description };
}

function scanDir(dir: string, out: Skill[]) {
  if (!existsSync(dir)) return;
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const skillPath = join(dir, ent.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const raw = readFileSync(skillPath, "utf8");
    const fm = parseFrontmatter(raw);
    const rel = skillPath.startsWith(workspace) ? skillPath.slice(workspace.length + 1) : skillPath;
    out.push({ name: fm.name || ent.name, description: fm.description, path: rel });
  }
}

export function listSkills(): Skill[] {
  const out: Skill[] = [];
  scanDir(join(workspace, ".cursor", "skills"), out);
  scanDir(join(workspace, "skills"), out);
  return out;
}

export function skillsSystemBlock() {
  const skills = listSkills();
  if (!skills.length) return "";
  const lines = skills.map((s) => `- ${s.name}: ${s.description || "(无描述)"} → ${s.path}`);
  return `\n项目 Skills（需要时可 read_file 读 SKILL.md）：\n${lines.join("\n")}`;
}
