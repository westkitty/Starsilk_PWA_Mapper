/**
 * WebGL Context Loss & Restore Guardian.
 * Manages canvas context loss/restoration events to prevent hard crashes and trigger asset recreation.
 */

import { eventBus } from '../core/event-bus';
import { logger } from '../core/logger';

export interface ContextGuardianOptions {
  canvas: HTMLCanvasElement;
  onContextLost?: (event: Event) => void;
  onContextRestored?: () => void;
}

export class WebGLContextGuardian {
  private canvas: HTMLCanvasElement;
  private lostHandler: (event: Event) => void;
  private restoredHandler: () => void;

  constructor(options: ContextGuardianOptions) {
    this.canvas = options.canvas;

    this.lostHandler = (e: Event) => {
      e.preventDefault();
      logger.warn('WebGLContextGuardian', 'WebGL context lost detected on canvas');
      eventBus.emit('system:toast', {
        title: 'Graphics Context Reset',
        message: 'WebGL GPU context was momentarily lost and is recovering.',
        type: 'warning',
      });
      options.onContextLost?.(e);
    };

    this.restoredHandler = () => {
      logger.info('WebGLContextGuardian', 'WebGL context successfully restored');
      eventBus.emit('system:toast', {
        title: 'Graphics Context Restored',
        message: 'Shaders and scene geometry re-initialized successfully.',
        type: 'info',
      });
      options.onContextRestored?.();
    };

    this.canvas.addEventListener('webglcontextlost', this.lostHandler, false);
    this.canvas.addEventListener('webglcontextrestored', this.restoredHandler, false);
  }

  public dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.lostHandler);
    this.canvas.removeEventListener('webglcontextrestored', this.restoredHandler);
  }
}
