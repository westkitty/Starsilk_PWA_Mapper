export type SemanticLodTier = 'detail' | 'context' | 'system';

export interface SemanticLodThresholds {
  detailExit: number;
  detailEnter: number;
  systemEnter: number;
  systemExit: number;
}

export const DEFAULT_SEMANTIC_LOD_THRESHOLDS: SemanticLodThresholds = {
  detailExit: 650,
  detailEnter: 520,
  systemEnter: 2200,
  systemExit: 1800,
};

export function resolveSemanticLod(
  distance: number,
  previous: SemanticLodTier,
  thresholds: SemanticLodThresholds = DEFAULT_SEMANTIC_LOD_THRESHOLDS
): SemanticLodTier {
  const d = Number.isFinite(distance) ? Math.max(0, distance) : 0;

  if (previous === 'detail') {
    return d > thresholds.detailExit ? 'context' : 'detail';
  }

  if (previous === 'system') {
    return d < thresholds.systemExit ? 'context' : 'system';
  }

  if (d < thresholds.detailEnter) return 'detail';
  if (d > thresholds.systemEnter) return 'system';
  return 'context';
}

export interface SmartLabelCandidate {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
  priority: number;
  selected?: boolean;
  hovered?: boolean;
  primary?: boolean;
}

export interface SmartLabelPlacement extends SmartLabelCandidate {
  labelX: number;
  labelY: number;
  width: number;
  height: number;
  leader: boolean;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlaps(a: Rect, b: Rect, padding: number = 4): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

export function layoutSmartLabels(
  candidates: SmartLabelCandidate[],
  viewportWidth: number,
  viewportHeight: number,
  maxLabels: number
): SmartLabelPlacement[] {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const acceptedRects: Rect[] = [];
  const placements: SmartLabelPlacement[] = [];

  const sorted = [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.depth - b.depth;
  });

  for (const candidate of sorted) {
    if (placements.length >= maxLabels) break;

    const labelWidth = clamp(34 + candidate.name.length * 6.5, 58, 168);
    const labelHeight = 22;
    const important = !!(candidate.selected || candidate.hovered || candidate.primary || candidate.priority >= 70);

    const offsets = [
      { x: 14, y: -31 },
      { x: 14, y: 9 },
      { x: -labelWidth - 14, y: -31 },
      { x: -labelWidth - 14, y: 9 },
      { x: -labelWidth / 2, y: -46 },
      { x: -labelWidth / 2, y: 22 },
    ];

    let chosen: Rect | null = null;
    let chosenScore = Number.POSITIVE_INFINITY;

    for (const offset of offsets) {
      const rect: Rect = {
        x: clamp(candidate.x + offset.x, 6, Math.max(6, width - labelWidth - 6)),
        y: clamp(candidate.y + offset.y, 6, Math.max(6, height - labelHeight - 6)),
        width: labelWidth,
        height: labelHeight,
      };

      const collisions = acceptedRects.filter(existing => overlaps(rect, existing));
      if (collisions.length === 0) {
        chosen = rect;
        chosenScore = 0;
        break;
      }

      if (important) {
        const score = collisions.reduce((sum, existing) => sum + overlapArea(rect, existing), 0);
        if (score < chosenScore) {
          chosen = rect;
          chosenScore = score;
        }
      }
    }

    if (!chosen) continue;

    acceptedRects.push(chosen);
    const centerX = chosen.x + chosen.width / 2;
    const centerY = chosen.y + chosen.height / 2;
    const leaderDistance = Math.hypot(centerX - candidate.x, centerY - candidate.y);

    placements.push({
      ...candidate,
      labelX: chosen.x,
      labelY: chosen.y,
      width: chosen.width,
      height: chosen.height,
      leader: important && leaderDistance > 28,
    });
  }

  return placements;
}

interface SmartLabelNodes {
  label: HTMLDivElement;
  leader: HTMLDivElement;
}

export class SmartBodyLabels {
  private root: HTMLDivElement;
  private nodes = new Map<string, SmartLabelNodes>();
  private parent: HTMLElement;
  private restoredParentPosition: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.parent = canvas.parentElement || canvas;
    const computedPosition = window.getComputedStyle(this.parent).position;
    if (computedPosition === 'static') {
      this.restoredParentPosition = this.parent.style.position;
      this.parent.style.position = 'relative';
    }

    this.root = document.createElement('div');
    this.root.className = 'smart-body-label-layer';
    this.root.setAttribute('aria-hidden', 'true');
    Object.assign(this.root.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '6',
    } satisfies Partial<CSSStyleDeclaration>);
    this.parent.appendChild(this.root);
  }

  public update(placements: SmartLabelPlacement[]): void {
    const active = new Set(placements.map(p => p.id));

    for (const [id, nodes] of this.nodes) {
      if (!active.has(id)) {
        nodes.label.remove();
        nodes.leader.remove();
        this.nodes.delete(id);
      }
    }

    for (const placement of placements) {
      let nodes = this.nodes.get(placement.id);
      if (!nodes) {
        const leader = document.createElement('div');
        const label = document.createElement('div');
        leader.className = 'smart-body-label-leader';
        label.className = 'smart-body-label';
        label.dataset.bodyId = placement.id;

        Object.assign(leader.style, {
          position: 'absolute',
          height: '1px',
          transformOrigin: '0 50%',
          background: 'linear-gradient(90deg, rgba(12,198,255,0.72), rgba(12,198,255,0.08))',
          pointerEvents: 'none',
          opacity: '0',
          transition: 'opacity 120ms ease',
        } satisfies Partial<CSSStyleDeclaration>);

        Object.assign(label.style, {
          position: 'absolute',
          minHeight: '18px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          padding: '3px 7px',
          border: '1px solid rgba(148,163,184,0.24)',
          borderRadius: '3px',
          background: 'rgba(3,5,10,0.78)',
          color: 'rgba(226,232,240,0.88)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '10px',
          lineHeight: '14px',
          letterSpacing: '0.035em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
          transition: 'transform 110ms ease, opacity 110ms ease, border-color 110ms ease',
          willChange: 'transform',
        } satisfies Partial<CSSStyleDeclaration>);

        this.root.appendChild(leader);
        this.root.appendChild(label);
        nodes = { label, leader };
        this.nodes.set(placement.id, nodes);
      }

      nodes.label.textContent = placement.name;
      nodes.label.style.width = `${placement.width}px`;
      nodes.label.style.transform = `translate3d(${placement.labelX}px, ${placement.labelY}px, 0)`;
      nodes.label.style.opacity = placement.selected ? '1' : placement.hovered ? '0.98' : placement.primary ? '0.9' : '0.72';
      nodes.label.style.borderColor = placement.selected
        ? 'rgba(12,198,255,0.9)'
        : placement.hovered
          ? 'rgba(125,211,252,0.68)'
          : 'rgba(148,163,184,0.24)';
      nodes.label.style.color = placement.selected || placement.hovered
        ? '#e8f8ff'
        : placement.primary
          ? '#c9f3ff'
          : 'rgba(226,232,240,0.82)';
      nodes.label.style.fontWeight = placement.selected || placement.hovered ? '700' : '500';

      if (placement.leader) {
        const targetX = placement.labelX + placement.width / 2;
        const targetY = placement.labelY + placement.height / 2;
        const dx = targetX - placement.x;
        const dy = targetY - placement.y;
        const length = Math.max(0, Math.hypot(dx, dy) - 8);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        nodes.leader.style.left = `${placement.x}px`;
        nodes.leader.style.top = `${placement.y}px`;
        nodes.leader.style.width = `${length}px`;
        nodes.leader.style.transform = `rotate(${angle}deg)`;
        nodes.leader.style.opacity = placement.selected ? '0.72' : '0.45';
      } else {
        nodes.leader.style.opacity = '0';
      }
    }
  }

  public clear(): void {
    for (const nodes of this.nodes.values()) {
      nodes.label.remove();
      nodes.leader.remove();
    }
    this.nodes.clear();
  }

  public dispose(): void {
    this.clear();
    this.root.remove();
    if (this.restoredParentPosition !== null) {
      this.parent.style.position = this.restoredParentPosition;
    }
  }
}
