import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Letter } from '@/lib/schemas';

type LetterInboxProps = {
  open: boolean;
  letters: Letter[];
  personaName: string;
  onClose: () => void;
  onSelectLetter: (letter: Letter) => void;
};

export function LetterInbox({
  open,
  letters,
  personaName,
  onClose,
  onSelectLetter,
}: LetterInboxProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>편지 보관함</DialogTitle>
        </DialogHeader>

        {letters.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            아직 받은 편지가 없어요.
          </p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {letters.map((letter) => {
              const isUnread = !letter.readAt;
              const sentDate = new Date(letter.sentAt).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <li key={letter.id}>
                  <button
                    type="button"
                    onClick={() => onSelectLetter(letter)}
                    className="w-full text-left rounded-md border border-border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-primary" aria-label="읽지 않음" />
                        )}
                        <p
                          className={`text-sm truncate ${isUnread ? 'font-medium' : 'text-muted-foreground'}`}
                        >
                          {personaName}의 편지
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isUnread && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            새 편지
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{sentDate}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {letter.content.slice(0, 50)}...
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
