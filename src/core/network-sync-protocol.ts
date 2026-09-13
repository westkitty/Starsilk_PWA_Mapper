/**
 * Network Sync Protocol & Delta Message Encoder.
 * Compact JSON and binary payloads for multi-client state synchronization.
 */

export interface NetworkSyncDelta {
  tick: number;
  timestamp: number;
  updatedBodies: {
    id: string;
    pos: [number, number, number];
    vel: [number, number, number];
  }[];
  removedBodyIds?: string[];
}

export class NetworkSyncProtocol {
  public static encodeDelta(delta: NetworkSyncDelta): string {
    return JSON.stringify(delta);
  }

  public static decodeDelta(raw: string): NetworkSyncDelta | null {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.tick === 'number' && Array.isArray(parsed.updatedBodies)) {
        return parsed as NetworkSyncDelta;
      }
      return null;
    } catch {
      return null;
    }
  }
}
