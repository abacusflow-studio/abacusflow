import type { ReactNode } from "react";
import { MotiView } from "moti";

import { Card } from "@components/ui/card";
import { cn } from "@lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  index?: number;
}

export function AnimatedCard({
  children,
  className,
  delay,
  index = 0,
}: AnimatedCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "timing",
        duration: 260,
        delay: delay ?? Math.min(index * 55, 240),
      }}
    >
      <Card className={cn("overflow-hidden py-0", className)}>{children}</Card>
    </MotiView>
  );
}
