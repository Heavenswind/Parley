import { assertDialogue } from './model/dialogue';
import type { Dialogue } from './model/types';

export function slug(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dialogue';
}

export function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readDialogueFile(file: File): Promise<Dialogue> {
  const data: unknown = JSON.parse(await file.text());
  assertDialogue(data);
  return data;
}
