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

export async function GET() {
  try {
    const dirs = ["02 Areas", "03 Projects", "08 Journal"];
    let allFiles = [];

    for (const d of dirs) {
      const files = await listGitHubDir(d);
      const mdFiles = files.filter(f => f.name.endsWith('.md'));
      for (const f of mdFiles) {
        allFiles.push(f.name.replace('.md', ''));
      }
    }

    // GitHub API non dà mtime, quindi restituiamo gli ultimi 10 file trovati
    const recent = allFiles.slice(0, 10);
    return NextResponse.json({ files: recent });
  } catch (error) {
    return NextResponse.json({ files: [] });
  }
}
