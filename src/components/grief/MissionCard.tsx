import type { Mission } from '@/lib/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STAGE_LABEL: Record<string, string> = {
  indoor: '집 안 활동',
  outdoor: '야외 활동',
  'meaningful-place': '의미 있는 장소',
};

type MissionCardProps = {
  mission: Mission;
  onAccept: () => void;
  onPass: () => void;
  onComplete: () => void;
};

export function MissionCard({ mission, onAccept, onPass, onComplete }: MissionCardProps) {
  const stageLabel = STAGE_LABEL[mission.stage] ?? mission.stage;
  const passesLeft = 3 - mission.passCount;
  const isAccepted = mission.status === 'accepted';

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            {stageLabel}
          </Badge>
          {isAccepted && (
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
              진행 중
            </Badge>
          )}
        </div>

        <p className="text-2xl font-medium leading-snug">{mission.text}</p>

        <div className="flex gap-2">
          {!isAccepted ? (
            <>
              <Button onClick={onAccept} size="sm" className="flex-1">
                해볼게요
              </Button>
              <Button
                onClick={onPass}
                size="sm"
                variant="ghost"
                className="flex-1 text-muted-foreground"
                disabled={passesLeft <= 0}
              >
                오늘은 패스 ({passesLeft}회 남음)
              </Button>
            </>
          ) : (
            <Button onClick={onComplete} size="sm" className="flex-1">
              완료했어요
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
