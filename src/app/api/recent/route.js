import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const base = '/Users/aurelianofaustoluigigelmini/Documents/MySecondBrain';
    const dirs = ['02 Areas', '03 Projects', '08 Journal'];
    
    let allFiles = [];
    for (const d of dirs) {
      const fullDir = path.join(base, d);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.md'));
      for (const f of files) {
        const stat = fs.statSync(path.join(fullDir, f));
        allFiles.push({ name: f.replace('.md', ''), mtime: stat.mtimeMs });
      }
    }

    // Ordina per data di modifica e prendi gli ultimi 8
    allFiles.sort((a, b) => b.mtime - a.mtime);
    const recent = allFiles.slice(0, 8).map(f => f.name);

    return NextResponse.json({ files: recent });
  } catch (error) {
    return NextResponse.json({ files: [] });
  }
}
