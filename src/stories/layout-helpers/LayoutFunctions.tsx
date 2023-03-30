export function convertToRem(value: number): string {
  const remValue = value / 4;
  return remValue + 'rem';
}
