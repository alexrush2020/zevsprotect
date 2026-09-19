export function nextOpenPlate(open: number | null, index: number): number | null {
  return open === index ? null : index;
}

export function canHoverOpenPlate(hover: boolean, pointerFine: boolean): boolean {
  return hover && pointerFine;
}
