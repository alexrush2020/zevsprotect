export function splitVat(gross: number, rate = 0.2) {
  const net = Math.round((gross / (1 + rate)) * 100) / 100;
  const vat = Math.round((gross - net) * 100) / 100;
  return { net, vat, gross };
}
