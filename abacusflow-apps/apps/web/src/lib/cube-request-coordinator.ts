export interface CubeTokenLease {
  token: string;
  expiresAt: number;
}

interface CubeRequestCoordinatorOptions {
  maxConcurrentQueries?: number;
  refreshSkewMs?: number;
  now?: () => number;
}

interface QueuedQuery {
  execute: () => void;
  cancel: () => void;
}

export class CubeRequestCoordinator {
  private readonly maxConcurrentQueries: number;
  private readonly refreshSkewMs: number;
  private readonly now: () => number;
  private readonly tokenCache = new Map<number, CubeTokenLease>();
  private readonly pendingTokenRequests = new Map<
    number,
    Promise<CubeTokenLease>
  >();
  private readonly queryQueue: QueuedQuery[] = [];
  private activeQueries = 0;
  private generation = 0;
  private retainedTenantId: number | null | undefined;

  constructor(options: CubeRequestCoordinatorOptions = {}) {
    this.maxConcurrentQueries = options.maxConcurrentQueries ?? 2;
    this.refreshSkewMs = options.refreshSkewMs ?? 30_000;
    this.now = options.now ?? Date.now;

    if (!Number.isInteger(this.maxConcurrentQueries) || this.maxConcurrentQueries < 1) {
      throw new Error("maxConcurrentQueries must be a positive integer");
    }
  }

  async getToken(
    tenantId: number,
    loader: () => Promise<CubeTokenLease>,
  ): Promise<string> {
    const cached = this.tokenCache.get(tenantId);
    if (
      cached &&
      cached.expiresAt * 1000 - this.refreshSkewMs > this.now()
    ) {
      return cached.token;
    }

    const pending = this.pendingTokenRequests.get(tenantId);
    if (pending) return (await pending).token;

    const requestGeneration = this.generation;
    const request = loader().then((lease) => {
      if (!lease.token || lease.expiresAt * 1000 <= this.now()) {
        throw new Error("Cube Token 响应无效或已过期");
      }
      if (requestGeneration === this.generation) {
        this.tokenCache.set(tenantId, lease);
      }
      return lease;
    });

    this.pendingTokenRequests.set(tenantId, request);
    try {
      return (await request).token;
    } finally {
      if (this.pendingTokenRequests.get(tenantId) === request) {
        this.pendingTokenRequests.delete(tenantId);
      }
    }
  }

  runQuery<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedQuery: QueuedQuery = {
        execute: () => {
          this.activeQueries += 1;
          task()
            .then(resolve, reject)
            .finally(() => {
              this.activeQueries -= 1;
              this.queryQueue.shift()?.execute();
            });
        },
        cancel: () => {
          reject(new Error("Cube 查询已因租户上下文变化而取消"));
        },
      };

      if (this.activeQueries < this.maxConcurrentQueries) queuedQuery.execute();
      else this.queryQueue.push(queuedQuery);
    });
  }

  retainTenant(tenantId: number | null): void {
    if (this.retainedTenantId === tenantId) return;
    this.retainedTenantId = tenantId;
    this.clearCachedTokens();
  }

  clear(): void {
    this.retainedTenantId = null;
    this.clearCachedTokens();
  }

  private clearCachedTokens(): void {
    this.generation += 1;
    this.tokenCache.clear();
    this.pendingTokenRequests.clear();
    this.queryQueue.splice(0).forEach((query) => query.cancel());
  }
}

export const cubeRequestCoordinator = new CubeRequestCoordinator({
  maxConcurrentQueries: 2,
});

export function retainCubeRequestTenant(tenantId: number | null): void {
  cubeRequestCoordinator.retainTenant(tenantId);
}

export function clearCubeRequestState(): void {
  cubeRequestCoordinator.clear();
}
