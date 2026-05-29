type LetterBannerProps = {
  count: number;
  onClick: () => void;
};

export function LetterBanner({ count, onClick }: LetterBannerProps) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between hover:bg-stone-200 transition-colors text-left"
      aria-label={`읽지 않은 편지 ${count}개가 도착했어요. 클릭하여 확인하세요.`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none" aria-hidden="true">✉</span>
        <div>
          <p className="text-sm font-medium text-stone-800">편지가 도착했어요</p>
          <p className="text-xs text-stone-500">
            {count}개의 읽지 않은 편지가 있어요
          </p>
        </div>
      </div>
      <span className="text-stone-400 text-sm" aria-hidden="true">→</span>
    </button>
  );
}
