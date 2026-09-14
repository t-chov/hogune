export type Exercise = {
  id: string;
  nameJa: string;
  instructionJa: string;
  voiceTextJa: string;
  voiceSrc: string;
  voiceDurationMs: number;
  enabled: boolean;
  deprecated?: boolean;
  review: {
    instructionReviewed: boolean;
    audioReviewed: boolean;
    reviewedAt: string;
    reviewer: string;
  };
  provenance: {
    voiceGenerator: 'VOICEVOX';
    voiceCharacter: '四国めたん';
    voiceStyle?: string;
  };
};

const placeholder = (
  id: string,
  nameJa: string,
  instructionJa: string,
): Exercise => ({
  id,
  nameJa,
  instructionJa,
  voiceTextJa: `次は、${nameJa}。${instructionJa}`,
  voiceSrc: `/exercises/${id}/voice.mp3`,
  voiceDurationMs: 0,
  enabled: false,
  review: {
    instructionReviewed: false,
    audioReviewed: false,
    reviewedAt: '',
    reviewer: '',
  },
  provenance: {
    voiceGenerator: 'VOICEVOX',
    voiceCharacter: '四国めたん',
  },
});

/** Reserved placeholders. Do not enable until reviewed assets and metadata exist. */
export const exercises = [
  placeholder('00A', '首のストレッチ', '痛みのない範囲でゆっくり傾けます。'),
  placeholder('00B', '肩のストレッチ', '肩をすくめず、呼吸を続けます。'),
  placeholder('00C', '背中のストレッチ', '反動をつけずに伸ばします。'),
] satisfies readonly Exercise[];
