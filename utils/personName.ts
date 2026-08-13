/** Nome de pessoa: letras (com acento), espaço, hífen e apóstrofo. Sem números. */
export function lettersOnlyName(value: string): string {
  return value
    .replace(/[^\p{L}\s'-]/gu, '')
    .replace(/\s{2,}/g, ' ');
}

/** Letras (com acento), números, espaço, hífen e apóstrofo. */
export function lettersAndNumbers(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .replace(/\s{2,}/g, ' ');
}
