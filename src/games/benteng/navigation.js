// Small visibility graph; recomputed only at the bot decision interval.
export function clearSegment(a, b, obstacles, padding) {
  return !obstacles.some((r) => {
    let enter = 0;
    let leave = 1;
    for (const [axis, size] of [['x', 'width'], ['y', 'height']]) {
      const lo = r[axis] - r[size] / 2 - padding;
      const hi = r[axis] + r[size] / 2 + padding;
      const d = b[axis] - a[axis];
      if (Math.abs(d) < 1e-8) {
        if (a[axis] < lo || a[axis] > hi) return false;
      } else {
        const t1 = (lo - a[axis]) / d;
        const t2 = (hi - a[axis]) / d;
        enter = Math.max(enter, Math.min(t1, t2));
        leave = Math.min(leave, Math.max(t1, t2));
      }
    }
    return enter <= leave;
  });
}

export function findRoute(start, goal, obstacles, radius) {
  if (clearSegment(start, goal, obstacles, radius)) return [{ ...goal }];
  const nodes = [{ ...start }, { ...goal }];
  for (const r of obstacles) {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) nodes.push({
      x: r.x + sx * (r.width / 2 + radius + 0.2),
      y: r.y + sy * (r.height / 2 + radius + 0.2),
    });
  }
  const costs = nodes.map(() => Infinity);
  const parent = nodes.map(() => -1);
  const visited = new Set();
  costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let u = -1;
    nodes.forEach((_, i) => { if (!visited.has(i) && (u < 0 || costs[i] < costs[u])) u = i; });
    if (u < 0 || !Number.isFinite(costs[u]) || u === 1) break;
    visited.add(u);
    nodes.forEach((v, i) => {
      if (visited.has(i) || !clearSegment(nodes[u], v, obstacles, radius)) return;
      const cost = costs[u] + Math.hypot(v.x - nodes[u].x, v.y - nodes[u].y);
      if (cost < costs[i]) { costs[i] = cost; parent[i] = u; }
    });
  }
  if (!Number.isFinite(costs[1])) return [];
  const route = [];
  for (let i = 1; i > 0; i = parent[i]) route.unshift(nodes[i]);
  return route;
}
