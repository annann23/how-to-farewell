import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useGriefStore } from '@/stores/grief-store';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const setUserId = useGriefStore((s) => s.setUserId);

  useEffect(() => {
    const isCallbackRoute = window.location.pathname === '/auth/callback';

    // 초기 세션 확인
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else if (!isCallbackRoute) {
        setUserId(null);
        void navigate({ to: '/auth' });
      }
    });

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else if (!isCallbackRoute) {
        setUserId(null);
        void navigate({ to: '/auth' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setUserId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      <Toaster position="top-center" richColors />

      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools position="bottom-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </div>
  );
}
