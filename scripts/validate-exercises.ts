import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { exercises } from '../src/data/exercises.ts';

const VOICE_BUDGET_BYTES = 150 * 1024;
const errors: string[] = [];
const seen = new Set<string>();

for (const exercise of exercises) {
  if (!/^[0-9A-F]{3}$/.test(exercise.id))
    errors.push(
      `${exercise.id}: ID must be three uppercase hexadecimal characters`,
    );
  if (seen.has(exercise.id)) errors.push(`${exercise.id}: duplicate ID`);
  seen.add(exercise.id);
  if (!exercise.enabled) continue;
  if (!exercise.review.instructionReviewed || !exercise.review.audioReviewed)
    errors.push(
      `${exercise.id}: enabled exercise requires instruction and audio review`,
    );
  if (
    !exercise.nameJa.trim() ||
    !exercise.instructionJa.trim() ||
    !exercise.voiceTextJa.trim()
  )
    errors.push(
      `${exercise.id}: name, instructions, and voice transcript are required`,
    );
  if (
    !Number.isFinite(exercise.voiceDurationMs) ||
    exercise.voiceDurationMs <= 0
  )
    errors.push(`${exercise.id}: voiceDurationMs must be positive and finite`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exercise.review.reviewedAt))
    errors.push(`${exercise.id}: reviewedAt must be YYYY-MM-DD`);
  if (!exercise.review.reviewer.trim())
    errors.push(`${exercise.id}: reviewer is required`);
  await validateAsset(exercise.id, exercise.voiceSrc, VOICE_BUDGET_BYTES);
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${exercises.length} exercise definitions (${exercises.filter((item) => item.enabled).length} enabled).`,
  );
}

async function validateAsset(
  id: string,
  publicPath: string,
  budget: number,
): Promise<void> {
  const filePath = resolve('public', publicPath.replace(/^\//, ''));
  try {
    await access(filePath, constants.R_OK);
    const info = await stat(filePath);
    if (info.size > budget)
      errors.push(`${id}: ${publicPath} exceeds ${budget} bytes`);
  } catch {
    errors.push(`${id}: missing asset ${publicPath}`);
  }
}
