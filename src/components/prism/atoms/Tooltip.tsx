'use client';

import React from 'react';
import { Tooltip as TremorTooltip } from '@/components/ui/Tooltip';

export interface TooltipProps {
  /** Text content displayed in the tooltip */
  content: string;
  /** Trigger element */
  children: React.ReactNode;
  /** Preferred side for the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Preferred alignment for the tooltip */
  align?: 'start' | 'center' | 'end';
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
}) => {
  // Note: Tremor Tooltip doesn't support 'align' prop, but we keep it in the interface
  // for API compatibility. The tooltip will always center-align.
  return (
    <TremorTooltip content={content} side={side}>
      {children}
    </TremorTooltip>
  );
};

Tooltip.displayName = 'Tooltip';
