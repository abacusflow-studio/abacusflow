import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { MotiView } from "moti";

import { triggerHaptic, type HapticKind } from "@lib/haptics";
import { cn } from "@lib/utils";

interface PressableScaleProps extends PressableProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  haptic?: HapticKind | false;
  scaleTo?: number;
}

export function PressableScale({
  children,
  className,
  contentClassName,
  disabled,
  haptic = "light",
  onPress,
  scaleTo = 0.97,
  ...props
}: PressableScaleProps) {
  return (
    <Pressable
      className={cn(disabled && "opacity-50", className)}
      disabled={disabled}
      onPress={(event) => {
        if (haptic) void triggerHaptic(haptic);
        onPress?.(event);
      }}
      {...props}
    >
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed && !disabled ? scaleTo : 1 }}
          transition={{ type: "timing", duration: 120 }}
          className={contentClassName}
        >
          {children}
        </MotiView>
      )}
    </Pressable>
  );
}
