import type { PersonaType } from '@/lib/schemas';
import { Button } from '@/components/ui/button';

type TypeOption = {
  value: PersonaType;
  label: string;
  description: string;
  emoji: string;
};

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: 'lover',
    label: '연인',
    description: '연인 또는 배우자와의 이별·사별',
    emoji: '♡',
  },
  {
    value: 'pet',
    label: '반려동물',
    description: '사랑하는 반려동물과의 이별',
    emoji: '~',
  },
  {
    value: 'family',
    label: '가족',
    description: '가족과의 이별·사별',
    emoji: '★',
  },
];

type OnboardingTypeSelectProps = {
  selected: PersonaType | null;
  onSelect: (type: PersonaType) => void;
  onNext: () => void;
};

export function OnboardingTypeSelect({ selected, onSelect, onNext }: OnboardingTypeSelectProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-muted-foreground text-sm">Step 1 / 2</p>
        <h2 className="text-xl font-semibold">누구와의 이별인가요?</h2>
        <p className="text-sm text-muted-foreground">AI 페르소나의 유형을 선택해주세요.</p>
      </div>

      <div className="grid gap-3">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full text-left rounded-lg border p-4 transition-colors ${
              selected === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none" aria-hidden="true">
                {option.emoji}
              </span>
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected === null && (
        <p className="text-xs text-destructive text-center">유형을 선택해주세요.</p>
      )}

      <Button
        onClick={onNext}
        disabled={selected === null}
        className="w-full"
        size="lg"
      >
        다음
      </Button>
    </div>
  );
}
