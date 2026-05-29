import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ImageGeneratingOverlay } from '@/components/grief/ImageGeneratingOverlay';
import { callGenerateImage } from '@/lib/api-client';
import { toast } from 'sonner';
import type { PersonaType } from '@/lib/schemas';

const formSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.').max(30, '이름은 30자 이하입니다.'),
  personality: z.string().max(500, '성격·특성은 500자 이하입니다.'),
  lossDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type PersonaFormData = {
  name: string;
  personality: string;
  lossDate?: string;
  photoDataUrl?: string;
};

type OnboardingPersonaFormProps = {
  type: PersonaType;
  onBack: () => void;
  onComplete: (data: PersonaFormData) => Promise<void>;
};

export function OnboardingPersonaForm({ type, onBack, onComplete }: OnboardingPersonaFormProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { personality: '' },
  });

  const personalityValue = watch('personality') ?? '';

  const typeLabel: Record<PersonaType, string> = {
    lover: '연인',
    pet: '반려동물',
    family: '가족',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일을 base64로 읽기
    const reader = new FileReader();
    reader.onload = async (event) => {
      const originalDataUrl = event.target?.result as string;
      if (!originalDataUrl) return;

      const base64 = originalDataUrl.split(',')[1];
      const mimeType = file.type;

      setIsGenerating(true);
      try {
        const result = await callGenerateImage(base64, mimeType);
        const generatedDataUrl = `data:image/png;base64,${result.generatedImageBase64}`;
        setPhotoDataUrl(generatedDataUrl);
        // 원본 사진은 저장하지 않음 (프라이버시)
      } catch (err) {
        // 실패 시 원본 fallback
        const message = err instanceof Error ? err.message : '이미지 생성에 실패했어요.';
        console.error(message);
        setPhotoDataUrl(originalDataUrl);
        toast.error('이미지 생성에 실패했어요. 원본 사진을 사용합니다.');
      } finally {
        setIsGenerating(false);
        // input 초기화 (원본 파일 참조 제거)
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await onComplete({
        name: values.name,
        personality: values.personality,
        lossDate: values.lossDate || undefined,
        photoDataUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ImageGeneratingOverlay visible={isGenerating} />

      <div className="space-y-6">
        <div className="text-center space-y-1">
          <p className="text-muted-foreground text-sm">Step 2 / 2</p>
          <h2 className="text-xl font-semibold">{typeLabel[type]}에 대해 알려주세요</h2>
          <p className="text-sm text-muted-foreground">
            입력한 정보를 바탕으로 AI 페르소나를 만들어드려요.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* 사진 업로드 */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoDataUrl} alt="페르소나 사진" />
              <AvatarFallback className="text-2xl bg-muted">
                {type === 'pet' ? '~' : type === 'lover' ? '♡' : '★'}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              id="photo-upload"
              onChange={handleFileChange}
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer text-sm text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {photoDataUrl ? '사진 변경하기' : '사진 추가하기 (선택)'}
            </label>
            <p className="text-xs text-muted-foreground text-center">
              사진을 업로드하면 AI로 생성된 이미지로 변환됩니다.
              <br />
              원본 사진은 즉시 삭제됩니다.
            </p>
          </div>

          {/* 이름 */}
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              이름 <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={type === 'pet' ? '초코' : '이름을 입력하세요'}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* 성격·특성 */}
          <div className="space-y-1">
            <label htmlFor="personality" className="text-sm font-medium">
              성격·특성 <span className="text-muted-foreground text-xs font-normal">(선택, 최대 500자)</span>
            </label>
            <Textarea
              id="personality"
              placeholder="예: 항상 밝고 따뜻했어요. 제가 힘들 때 먼저 알아채고 위로해줬어요."
              className="resize-none"
              rows={4}
              maxLength={500}
              {...register('personality')}
            />
            <div className="flex justify-between items-center">
              {errors.personality ? (
                <p className="text-xs text-destructive">{errors.personality.message}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">{personalityValue.length}/500</p>
            </div>
          </div>

          {/* 사별·이별 시점 */}
          <div className="space-y-1">
            <label htmlFor="lossDate" className="text-sm font-medium">
              사별·이별 시점{' '}
              <span className="text-muted-foreground text-xs font-normal">(선택)</span>
            </label>
            <input
              id="lossDate"
              type="date"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              max={new Date().toISOString().slice(0, 10)}
              {...register('lossDate')}
            />
            <p className="text-xs text-muted-foreground">
              입력하지 않으면 오늘 날짜를 기준으로 합니다.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              이전
            </Button>
            <Button type="submit" disabled={isSubmitting || isGenerating} className="flex-1">
              {isSubmitting ? '완료 중...' : '완료'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
