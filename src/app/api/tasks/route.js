import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Leggiamo direttamente il file dal tuo Secondo Cervello locale
    const filePath = '/Users/aurelianofaustoluigigelmini/Documents/MySecondBrain/08 Journal/Dashboard Task.md';
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File non trovato' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Estraiamo solo le righe che contengono delle vere e proprie Task (- [ ] o - [/] o - [x])
    const lines = content.split('\n');
    const tasks = lines
      .filter(line => line.includes('- [') && line.includes(']'))
      .map(line => {
        const isDone = line.includes('- [x]') || line.includes('- [X]');
        const text = line.replace(/- \[[x X\/]\] /, '').trim();
        return { text, isDone };
      });

    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
