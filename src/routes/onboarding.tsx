import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DisclaimerScreen } from '@/components/grief/DisclaimerScreen';
import { OnboardingTypeSelect } from '@/components/grief/OnboardingTypeSelect';
import { OnboardingPersonaForm } from '@/components/grief/OnboardingPersonaForm';
import { useGriefStore } from '@/stores/grief-store';
import type { PersonaType } from '@/lib/schemas';
import { toast } from 'sonner';

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
});

type OnboardingStep = 'disclaimer' | 'type-select' | 'persona-form';

function OnboardingPage() {
  const navigate = useNavigate();
  const { userId, setDisclaimer, setPersona } = useGriefStore();
  const [step, setStep] = useState<OnboardingStep>('disclaimer');
  const [selectedType, setSelectedType] = useState<PersonaType | null>(null);

  const handleDisclaimerAgree = async (isAdult: boolean) => {
    if (!userId) {
      await navigate({ to: '/auth' });
      return;
    }
    try {
      await setDisclaimer({
        userId,
        agreedAt: new Date().toISOString(),
        isAdult,
      });
      setStep('type-select');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
      toast.error(msg);
    }
  };

  const handleTypeNext = () => {
    if (!selectedType) return;
    setStep('persona-form');
  };

  const handlePersonaComplete = async (data: {
    name: string;
    personality: string;
    lossDate?: string;
    photoDataUrl?: string;
  }) => {
    if (!userId || !selectedType) return;

    const now = new Date().toISOString();
    const persona = {
      id: uuidv4(),
      userId,
      type: selectedType,
      name: data.name,
      personality: data.personality,
      lossDate: data.lossDate
        ? new Date(data.lossDate).toISOString()
        : undefined,
      createdAt: now,
      photoDataUrl: data.photoDataUrl,
      generatedImageUrl: undefined,
    };

    await setPersona(persona);

    // 생성된 이미지를 localStorage에 저장 (photoDataUrl은 스토어에서 분리)
    if (data.photoDataUrl) {
      localStorage.setItem(`persona_image_${persona.id}`, data.photoDataUrl);
    }

    toast.success(`${data.name}의 페르소나를 만들었어요.`);
    await navigate({ to: '/' });
  };

  if (step === 'disclaimer') {
    return <DisclaimerScreen onAgree={handleDisclaimerAgree} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {step === 'type-select' && (
          <OnboardingTypeSelect
            selected={selectedType}
            onSelect={setSelectedType}
            onNext={handleTypeNext}
          />
        )}
        {step === 'persona-form' && selectedType && (
          <OnboardingPersonaForm
            type={selectedType}
            onBack={() => setStep('type-select')}
            onComplete={handlePersonaComplete}
          />
        )}
      </div>
    </div>
  );
}
