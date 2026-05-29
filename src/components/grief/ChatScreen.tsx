import { useRef, useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useGriefStore, getDailyLimit } from '@/stores/grief-store';
import { CrisisPopup } from '@/components/grief/CrisisPopup';
import { MissionCard } from '@/components/grief/MissionCard';
import { LetterBanner } from '@/components/grief/LetterBanner';
import { LetterModal } from '@/components/grief/LetterModal';
import { LetterInbox } from '@/components/grief/LetterInbox';
import type { Letter } from '@/lib/schemas';

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" aria-label="AI가 입력 중입니다">
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs" aria-hidden="true">AI</span>
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

export function ChatScreen() {
  const {
    persona,
    messages,
    isTyping,
    lastError,
    contactLimit,
    crisisLevel,
    crisisPopupVisible,
    currentMission,
    unreadLetters,
    letterInbox,
    sendMessage,
    retryLastMessage,
    dismissCrisis,
    acceptMission,
    passMission,
    completeMission,
    markLetterAsRead,
    fetchUnreadLetters,
    fetchAllLetters,
    fetchContactLimit,
    fetchCurrentMission,
    clearError,
  } = useGriefStore();

  const [input, setInput] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 초기 데이터 로드
  useEffect(() => {
    void fetchContactLimit();
    void fetchUnreadLetters();
    void fetchCurrentMission();
  }, [fetchContactLimit, fetchUnreadLetters, fetchCurrentMission]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 연락 제한 계산
  const dailyLimit = getDailyLimit(contactLimit.weeksSinceStart);
  const remaining = Math.max(0, dailyLimit - contactLimit.usedCount);
  const isLimitReached = remaining === 0;
  const progressPercent = dailyLimit > 0 ? ((dailyLimit - remaining) / dailyLimit) * 100 : 0;

  // 미션 표시 여부 (loss_date 기준 30일 이후)
  const showMission = (() => {
    if (!persona || !currentMission) return false;
    const baseDate = persona.lossDate ?? persona.createdAt;
    const base = new Date(baseDate).getTime();
    const now = Date.now();
    const days = Math.floor((now - base) / (1000 * 60 * 60 * 24));
    return days >= 30;
  })();

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping || isLimitReached) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, isTyping, isLimitReached, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleLetterClick = async (letter: Letter) => {
    setSelectedLetter(letter);
    setInboxOpen(false);
    if (!letter.readAt) {
      await markLetterAsRead(letter.id);
    }
  };

  const handleLetterBannerClick = () => {
    if (unreadLetters.length === 1) {
      void handleLetterClick(unreadLetters[0]);
    } else {
      void fetchAllLetters();
      setInboxOpen(true);
    }
  };

  const handleInboxOpen = async () => {
    await fetchAllLetters();
    setInboxOpen(true);
  };

  const personaImageSrc = persona?.id
    ? localStorage.getItem(`persona_image_${persona.id}`) ?? undefined
    : undefined;

  const personaInitial = persona?.name?.[0] ?? 'A';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 위기 팝업 Level 1 배너는 화면 최상단 */}
      {crisisLevel === 1 && crisisPopupVisible && (
        <CrisisPopup level={1} visible={crisisPopupVisible} onDismiss={dismissCrisis} />
      )}

      {/* 편지 도착 배너 */}
      {unreadLetters.length > 0 && (
        <LetterBanner count={unreadLetters.length} onClick={handleLetterBannerClick} />
      )}

      {/* 헤더 */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={personaImageSrc} alt={persona?.name ?? 'AI 페르소나'} />
            <AvatarFallback>{personaInitial}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{persona?.name ?? 'AI 페르소나'}</p>
            <p className="text-xs text-muted-foreground">
              {isTyping ? '입력 중...' : '온라인'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInboxOpen}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent"
          aria-label="편지 보관함 열기"
        >
          편지 보관함
        </button>
      </header>

      {/* 연락 제한 배너 */}
      <div className="px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>오늘 남은 대화</span>
          <span>
            {isLimitReached ? (
              <span className="text-destructive font-medium">오늘 대화를 모두 사용했어요</span>
            ) : (
              <span>
                <span className="font-medium text-foreground">{remaining}회</span> / {dailyLimit}회
              </span>
            )}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </div>

      {/* 메시지 목록 */}
      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            <p>{persona?.name ?? 'AI 페르소나'}와 대화를 시작해보세요.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'assistant' && (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={personaImageSrc} alt={persona?.name ?? 'AI'} />
                <AvatarFallback className="text-xs">{personaInitial}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-primary text-primary-foreground'
                  : 'rounded-bl-sm bg-muted text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </main>

      {/* 에러 배너 */}
      {lastError && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between text-sm text-destructive shrink-0">
          <span>AI와 연결에 실패했어요. 다시 시도해주세요.</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void retryLastMessage()}
              className="text-xs underline underline-offset-2 hover:no-underline"
            >
              재시도
            </button>
            <button
              type="button"
              onClick={clearError}
              className="text-xs"
              aria-label="에러 닫기"
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* 미션 카드 */}
      {showMission && currentMission && (
        <div className="px-4 py-3 border-t shrink-0">
          <MissionCard
            mission={currentMission}
            onAccept={() => void acceptMission()}
            onPass={() => void passMission()}
            onComplete={() => void completeMission()}
          />
        </div>
      )}

      {/* 입력창 */}
      <div className="px-4 py-3 border-t shrink-0">
        {isLimitReached ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            내일 오전 00:00부터 다시 대화할 수 있어요
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
              className="resize-none min-h-[40px] max-h-32 text-sm"
              rows={1}
              disabled={isTyping}
              aria-label="메시지 입력"
            />
            <Button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isTyping}
              size="sm"
              className="shrink-0 h-9"
              aria-label="전송"
            >
              전송
            </Button>
          </div>
        )}
      </div>

      {/* 위기 팝업 Level 2, 3 */}
      {(crisisLevel === 2 || crisisLevel === 3) && (
        <CrisisPopup level={crisisLevel} visible={crisisPopupVisible} onDismiss={dismissCrisis} />
      )}

      {/* 편지 모달 */}
      <LetterModal
        letter={selectedLetter}
        personaName={persona?.name ?? 'AI 페르소나'}
        onClose={() => setSelectedLetter(null)}
      />

      {/* 편지 보관함 */}
      <LetterInbox
        open={inboxOpen}
        letters={letterInbox}
        personaName={persona?.name ?? 'AI 페르소나'}
        onClose={() => setInboxOpen(false)}
        onSelectLetter={(letter) => void handleLetterClick(letter)}
      />
    </div>
  );
}

