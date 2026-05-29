type ImageGeneratingOverlayProps = {
  visible: boolean;
};

export function ImageGeneratingOverlay({ visible }: ImageGeneratingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-foreground animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-base font-medium">이미지를 생성하고 있어요</p>
        <p className="text-sm text-muted-foreground">
          AI가 사진을 분석하는 중입니다. 잠시만 기다려주세요.
          <br />
          최대 30초까지 소요될 수 있어요.
        </p>
      </div>
    </div>
  );
}
