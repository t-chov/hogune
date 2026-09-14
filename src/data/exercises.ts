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

/** Drafts stay disabled until human instruction/audio reviews and assets exist. */
export const exercises = [
  placeholder('00A', '首のストレッチ', '痛みのない範囲でゆっくり傾けます。'),
  placeholder('00B', '肩のストレッチ', '肩をすくめず、呼吸を続けます。'),
  placeholder('00C', '背中のストレッチ', '反動をつけずに伸ばします。'),
  placeholder(
    '00D',
    '股関節の前のストレッチ、右',
    '右ひざを折りたたんだタオルの上につき、左足を前に置きます。左手を左ももに、右手を右腰に添えます。上体を起こし、お腹に軽く力を入れ、腰を反らさずに体重を少し前へ移します。右脚の付け根の前が軽く伸びる位置で止めます。痛みがあれば中止し、反動をつけず、楽に呼吸を続けます。',
  ),
  placeholder(
    '00E',
    '股関節の前のストレッチ、左',
    '左ひざを折りたたんだタオルの上につき、右足を前に置きます。右手を右ももに、左手を左腰に添えます。上体を起こし、お腹に軽く力を入れ、腰を反らさずに体重を少し前へ移します。左脚の付け根の前が軽く伸びる位置で止めます。痛みがあれば中止し、反動をつけず、楽に呼吸を続けます。',
  ),
  placeholder(
    '00F',
    'もも裏のストレッチ、右',
    'あおむけになり、両ひざを曲げ、足裏を床につけます。右脚を持ち上げ、両手で右ももの裏を支えます。左足は床に置いたまま、右ひざをゆっくり伸ばし、もも裏が軽く伸びる位置で止めます。ひざは曲がっていてもかまいません。ひざの関節を手で引っ張らず、痛みがあれば中止し、楽に呼吸を続けます。',
  ),
  placeholder(
    '010',
    'もも裏のストレッチ、左',
    'あおむけになり、両ひざを曲げ、足裏を床につけます。左脚を持ち上げ、両手で左ももの裏を支えます。右足は床に置いたまま、左ひざをゆっくり伸ばし、もも裏が軽く伸びる位置で止めます。ひざは曲がっていてもかまいません。ひざの関節を手で引っ張らず、痛みがあれば中止し、楽に呼吸を続けます。',
  ),
  placeholder(
    '011',
    '広背筋のストレッチ',
    '四つばいになり、足の甲を床につけ、両ひざを少し開きます。両手を前の床に置いたまま、お尻をゆっくりかかとへ近づけます。腕と背中を長く伸ばし、わきの下から背中の横が軽く伸びる位置で止めます。お尻をかかとへ、額を床へ無理に押しつけず、腰を反らさないようにします。痛みがあれば中止し、楽に呼吸を続けます。',
  ),
] satisfies readonly Exercise[];
