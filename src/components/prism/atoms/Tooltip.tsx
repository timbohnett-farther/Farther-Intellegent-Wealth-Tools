'use client';

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import clsx from 'clsx';

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
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={6}
            className={clsx(
              'z-50 max-w-xs rounded-md border border-limestone-200 bg-white px-3 py-1.5 text-xs text-charcoal-900 shadow-md',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=top]:slide-in-from-bottom-2',
              'data-[side=right]:slide-in-from-left-2',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=left]:slide-in-from-right-2',
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-white" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

Tooltip.displayName = 'Tooltip';
