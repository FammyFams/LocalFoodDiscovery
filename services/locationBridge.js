let pending = null;

export function setPendingLocation(coords, radius) {
  pending = { coords, radius };
}

export function consumePendingLocation() {
  const loc = pending;
  pending = null;
  return loc;
}
