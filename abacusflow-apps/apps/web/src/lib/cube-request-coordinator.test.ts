import assert from "node:assert/strict";
import test from "node:test";
import { CubeRequestCoordinator } from "./cube-request-coordinator.ts";

test("concurrent requests for one tenant share a single token load", async () => {
  const coordinator = new CubeRequestCoordinator({ now: () => 1_000 });
  let loads = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loader = async () => {
    loads += 1;
    await gate;
    return { token: "tenant-100-token", expiresAt: 301 };
  };

  const first = coordinator.getToken(100, loader);
  const second = coordinator.getToken(100, loader);
  release();

  assert.deepEqual(await Promise.all([first, second]), [
    "tenant-100-token",
    "tenant-100-token",
  ]);
  assert.equal(loads, 1);
});

test("token cache is isolated by tenant and cleared on tenant switch", async () => {
  const coordinator = new CubeRequestCoordinator({ now: () => 1_000 });
  let loads = 0;
  const load = (tenantId: number) => async () => {
    loads += 1;
    return { token: `tenant-${tenantId}-token-${loads}`, expiresAt: 301 };
  };

  coordinator.retainTenant(100);
  assert.equal(await coordinator.getToken(100, load(100)), "tenant-100-token-1");
  assert.equal(await coordinator.getToken(100, load(100)), "tenant-100-token-1");

  coordinator.retainTenant(200);
  assert.equal(await coordinator.getToken(200, load(200)), "tenant-200-token-2");

  coordinator.retainTenant(100);
  assert.equal(await coordinator.getToken(100, load(100)), "tenant-100-token-3");
  assert.equal(loads, 3);
});

test("query concurrency never exceeds the configured limit", async () => {
  const coordinator = new CubeRequestCoordinator({ maxConcurrentQueries: 2 });
  let active = 0;
  let peak = 0;
  const completions: Array<() => void> = [];
  const task = () =>
    coordinator.runQuery(
      () =>
        new Promise<number>((resolve) => {
          active += 1;
          peak = Math.max(peak, active);
          completions.push(() => {
            active -= 1;
            resolve(active);
          });
        }),
    );

  const requests = [task(), task(), task(), task(), task()];
  assert.equal(completions.length, 2);
  while (completions.length > 0) {
    completions.shift()?.();
    await new Promise((resolve) => setImmediate(resolve));
  }

  await Promise.all(requests);
  assert.equal(peak, 2);
});
