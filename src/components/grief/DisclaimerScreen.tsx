import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

type DisclaimerScreenProps = {
  onAgree: (isAdult: boolean) => void;
};

export function DisclaimerScreen({ onAgree }: DisclaimerScreenProps) {
  const [isAdult, setIsAdult] = useState(false);
  const [isUnderstood, setIsUnderstood] = useState(false);

  const canProceed = isAdult && isUnderstood;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">시작 전 꼭 읽어주세요</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4 text-sm text-card-foreground">
          <p className="font-medium text-base">이 서비스는 보조 도구입니다</p>
          <p className="text-muted-foreground leading-relaxed">
            Closure는 사별·이별을 경험한 분들이 감정을 안전하게 처리하도록 돕는 보조 도구입니다.
            이 서비스는 <strong>전문 심리 치료나 상담을 대체하지 않습니다.</strong>
          </p>
          <p className="text-muted-foreground leading-relaxed">
            심각한 심리적 어려움을 겪고 계신다면 반드시 전문가(정신건강 위기상담 전화:{' '}
            <strong>1577-0199</strong>, 자살예방상담전화: <strong>1393</strong>)에게 도움을
            구하세요.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            AI 페르소나와의 대화는 실제 고인 또는 이별한 상대방과의 대화가 아닙니다. AI가 생성한
            응답임을 항상 인식해 주세요.
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              id="understood"
              checked={isUnderstood}
              onCheckedChange={(checked) => setIsUnderstood(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">
              이 서비스가 전문 치료를 대체하지 않는 보조 도구임을 이해했으며, AI 응답임을
              인식하고 사용합니다.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              id="adult"
              checked={isAdult}
              onCheckedChange={(checked) => setIsAdult(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-relaxed">
              <strong>만 18세 이상임을 확인합니다.</strong>
            </span>
          </label>
        </div>

        <Button
          onClick={() => onAgree(isAdult)}
          disabled={!canProceed}
          className="w-full"
          size="lg"
        >
          동의하고 시작하기
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          동의하지 않으면 서비스를 이용할 수 없습니다.
        </p>
      </div>
    </div>
  );
}
