import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useGriefStore } from '@/stores/grief-store';
import { ChatScreen } from '@/components/grief/ChatScreen';
import { supabase } from '@/lib/supabase';
import {
  PersonaRowSchema,
  DisclaimerRowSchema,
  personaRowToSchema,
} from '@/lib/schemas';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { userId, persona, disclaimer, setPersona, setDisclaimer } = useGriefStore();

  useEffect(() => {
    if (!userId) {
      void navigate({ to: '/auth' });
      return;
    }

    // 온보딩 완료 여부 확인 (페르소나 없으면 로드 시도)
    if (!persona) {
      void (async () => {
        try {
          const { data } = await supabase
            .from('personas')
            .select('*')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();

          if (data) {
            const parsed = PersonaRowSchema.safeParse(data);
            if (parsed.success) {
              await setPersona(personaRowToSchema(parsed.data));
              return;
            }
          }
          // 페르소나 없음 → 온보딩으로
          await navigate({ to: '/onboarding' });
        } catch (err) {
          console.error('Persona 로드 실패:', err);
          await navigate({ to: '/onboarding' });
        }
      })();
      return;
    }

    // 고지 동의 확인
    if (!disclaimer) {
      void (async () => {
        try {
          const { data } = await supabase
            .from('disclaimers')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (!data) {
            await navigate({ to: '/onboarding' });
            return;
          }

          const parsed = DisclaimerRowSchema.safeParse(data);
          if (!parsed.success) {
            await navigate({ to: '/onboarding' });
            return;
          }

          await setDisclaimer({
            userId,
            agreedAt: parsed.data.agreed_at,
            isAdult: parsed.data.is_adult,
          });
        } catch (err) {
          console.error('Disclaimer 로드 실패:', err);
        }
      })();
    }
  }, [userId, persona, disclaimer, navigate, setPersona, setDisclaimer]);

  // 인증되지 않음
  if (!userId) return null;

  // 페르소나 없음 (로딩 중)
  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  return <ChatScreen />;
}
