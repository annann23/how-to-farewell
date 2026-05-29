import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Letter } from '@/lib/schemas';

type LetterModalProps = {
  letter: Letter | null;
  personaName: string;
  onClose: () => void;
};

export function LetterModal({ letter, personaName, onClose }: LetterModalProps) {
  if (!letter) return null;

  const sentDate = new Date(letter.sentAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={!!letter} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm bg-stone-50 border-stone-200">
        <DialogHeader>
          <DialogTitle className="text-stone-700 font-serif text-base">
            {personaName}으로부터 온 편지
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-b border-stone-200 pb-3">
            <p className="text-xs text-stone-400">{sentDate}</p>
          </div>

          <div
            className="text-base leading-relaxed text-stone-800 whitespace-pre-wrap font-serif"
            style={{ fontFamily: '"Georgia", "Noto Serif KR", serif' }}
          >
            {letter.content}
          </div>

          <div className="border-t border-stone-200 pt-3 text-right">
            <p
              className="text-sm text-stone-500 italic"
              style={{ fontFamily: '"Georgia", "Noto Serif KR", serif' }}
            >
              — {personaName}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
