import { NextResponse } from 'next/server';

const GITHUB_PAT = process.env.GITHUB_PAT;
const REPO = "Reconoised/MySecondBrain";

async function listGitHubDir(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `token ${GITHUB_PAT}`,
      "Accept": "application/vnd.github.v3+json"
    },
    cache: "no-store"
  });
  if (!res.ok) return [];
  return await res.json();
}

async function fetchGitHubFile(path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `token ${GITHUB_PAT}`,
      "Accept": "application/vnd.github.v3.raw"
    },
    cache: "no-store"
  });
  if (!res.ok) return null;
  return await res.text();
}

export async function GET() {
  try {
    const files = await listGitHubDir("03 Projects");
    const mdFiles = files.filter(f => f.name.endsWith('.md'));

    const projects = [];
    for (const f of mdFiles.slice(0, 15)) {
      const content = await fetchGitHubFile(f.path);
      if (!content) continue;
      const statusMatch = content.match(/status:\s*(.+)/i);
      projects.push({
        name: f.name.replace('.md', ''),
        status: statusMatch ? statusMatch[1].trim() : 'Attivo'
      });
    }

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ projects: [] });
  }
}
