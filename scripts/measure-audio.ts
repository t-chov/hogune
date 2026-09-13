import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exercises } from '../src/data/exercises.ts';

const run = promisify(execFile);
const enabled = exercises.filter((exercise) => exercise.enabled);

if (enabled.length === 0) {
  console.log('No enabled exercise audio to measure.');
} else {
  for (const exercise of enabled) {
    const path = `public${exercise.voiceSrc}`;
    const { stdout } = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      path,
    ]);
    const measuredMs = Math.round(Number(stdout.trim()) * 1_000);
    const differenceMs = measuredMs - exercise.voiceDurationMs;
    console.log(
      `${exercise.id}: measured=${measuredMs}ms manifest=${exercise.voiceDurationMs}ms difference=${differenceMs}ms`,
    );
    if (!Number.isFinite(measuredMs) || Math.abs(differenceMs) > 100)
      process.exitCode = 1;
  }
}
