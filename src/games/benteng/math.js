export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(vector, fallback = { x: 0, y: 0 }) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= Number.EPSILON) return { ...fallback };
  return { x: vector.x / length, y: vector.y / length };
}

export function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

export function insideCircle(point, center, radius) {
  return distance(point, center) <= radius;
}

export function expandedRectContains(point, rect, expansion = 0) {
  return point.x >= rect.x - rect.width / 2 - expansion
    && point.x <= rect.x + rect.width / 2 + expansion
    && point.y >= rect.y - rect.height / 2 - expansion
    && point.y <= rect.y + rect.height / 2 + expansion;
}

