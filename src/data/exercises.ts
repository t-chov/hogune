export type Exercise = {
  id: string;
  nameJa: string;
  instructionJa?: string;
  imageSrc: string;
  voiceSrc: string;
  voiceDurationMs: number;
  imageAltJa: string;
  enabled: boolean;
  deprecated?: boolean;
  review: {
    poseReviewed: boolean;
    reviewedAt: string;
    reviewer: string;
  };
  provenance: {
    imageGenerator?: string;
    imageModel?: string;
    imageModelLicense?: string;
    imagePromptFile?: string;
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
  imageSrc: `/exercises/${id}/image.webp`,
  voiceSrc: `/exercises/${id}/voice.mp3`,
  voiceDurationMs: 0,
  imageAltJa: `${nameJa}の姿勢を示す画像（準備中）`,
  enabled: false,
  review: {
    poseReviewed: false,
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
