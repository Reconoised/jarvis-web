import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dir = '/Users/aurelianofaustoluigigelmini/Documents/MySecondBrain/03 Projects';
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ projects: [] });
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    const projects = files.map(f => {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const statusMatch = content.match(/status:\s*(.+)/i);
      return {
        name: f.replace('.md', ''),
        status: statusMatch ? statusMatch[1].trim() : 'Attivo'
      };
    });

    return NextResponse.json({ projects });
  } catch (error) {
    return NextResponse.json({ projects: [] });
  }
}
