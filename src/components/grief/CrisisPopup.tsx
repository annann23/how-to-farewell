import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type CrisisPopupProps = {
  level: 0 | 1 | 2 | 3;
  visible: boolean;
  onDismiss: () => void;
};

const CRISIS_NOTICE = '이 기능은 의료 행위가 아닙니다. 전문 상담이나 치료를 대체하지 않습니다.';

export function CrisisPopup({ level, visible, onDismiss }: CrisisPopupProps) {
  if (!visible || level === 0) return null;

  if (level === 1) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-40 px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-3"
      >
        <span className="text-amber-600 text-lg leading-none mt-0.5" aria-hidden="true">!</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-amber-900">많이 힘드시죠.</p>
          <p className="text-sm text-amber-800">
            전문가의 도움이 도움이 될 수 있어요. 정신건강 위기상담 전화{' '}
            <a href="tel:1577-0199" className="font-semibold underline">
              1577-0199
            </a>{' '}
            또는 자살예방상담전화{' '}
            <a href="tel:1393" className="font-semibold underline">
              1393
            </a>
            으로 연락해보세요.
          </p>
          <p className="text-xs text-amber-600">{CRISIS_NOTICE}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 text-lg leading-none"
          aria-label="닫기"
        >
          x
        </button>
      </div>
    );
  }

  if (level === 2) {
    return (
      <Dialog open={visible} onOpenChange={(open) => { if (!open) onDismiss(); }}>
        <DialogContent
          role="alertdialog"
          aria-live="assertive"
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle className="text-orange-700">마음이 많이 힘드신가요?</DialogTitle>
            <DialogDescription className="text-foreground">
              지금 많이 힘드신 것 같아요. 혼자 감당하지 않으셔도 돼요.
              전문 상담사와 이야기 나눠보시겠어요?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <a
              href="tel:1393"
              className="flex items-center justify-center w-full h-10 rounded-md bg-orange-600 text-white font-medium text-sm hover:bg-orange-700 transition-colors"
            >
              자살예방상담전화 1393 전화하기
            </a>
            <Button
              variant="ghost"
              className="w-full"
              onClick={onDismiss}
            >
              괜찮아요, 대화를 계속할게요
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">{CRISIS_NOTICE}</p>
        </DialogContent>
      </Dialog>
    );
  }

  // Level 3: 닫기 버튼 없음
  return (
    <AlertDialog open={visible}>
      <AlertDialogContent
        role="alertdialog"
        aria-live="assertive"
        className="max-w-sm border-destructive"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            지금 많이 힘드신 것 같아요
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground">
            지금 이 순간 가장 중요한 것은 당신의 안전입니다.
            전문가와 연결하거나, 대화를 계속하면서 마음을 달래보세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <a
            href="tel:1393"
            className="flex items-center justify-center w-full h-10 rounded-md bg-destructive text-destructive-foreground font-medium text-sm hover:bg-destructive/90 transition-colors"
          >
            1393 전화하기
          </a>
          <AlertDialogAction
            onClick={onDismiss}
            className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            일단 대화 계속하기
          </AlertDialogAction>
        </AlertDialogFooter>

        <p className="text-xs text-muted-foreground text-center">{CRISIS_NOTICE}</p>
      </AlertDialogContent>
    </AlertDialog>
  );
}
