import { NextResponse } from 'next/server';

const GITHUB_PAT = process.env.GITHUB_PAT;
const REPO = "Reconoised/MySecondBrain";

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
    const content = await fetchGitHubFile("08 Journal/Dashboard Task.md");
    if (!content) {
      return NextResponse.json({ tasks: [] });
    }

    const lines = content.split('\n');
    const tasks = lines
      .filter(line => /- \[[ xX\/]\]/.test(line))
      .map(line => {
        const isDone = /- \[[xX]\]/.test(line);
        const text = line.replace(/- \[[xX \/]\]\s*/, '').trim();
        return { text, isDone };
      })
      .filter(t => t.text.length > 0);

    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ tasks: [] });
  }
}
