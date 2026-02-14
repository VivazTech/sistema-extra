/**
 * Regras de arredondamento usadas no sistema.
 */

/** Arredonda horas para inteiro: parte fracionária < 0,50 → baixo, >= 0,50 → cima. Ex: 7,4 → 7; 7,5 → 8. */
export function roundHoursToInteger(hours: number): number {
  return Math.round(hours);
}

/** Arredonda horas para 1 casa decimal com a mesma regra. Ex: 7,34 → 7,3; 7,36 → 7,4. */
export function roundHoursToOneDecimal(hours: number): number {
  return Math.round(hours * 10) / 10;
}

/**
 * Arredonda valor monetário para reais inteiros (xxx,00) com regra específica:
 *
 * 1. Centavos >= 56 → arredonda para cima (100,56 → 101,00)
 * 2. Centavos <= 55 → arredonda para baixo (100,54 → 100,00; 100,55 → 100,00)
 * 3. Resultado não pode ser ímpar: se der 101,00, sobe para 102,00
 *
 * Exemplos: 100,56→102  100,54→100  100,55→100  127,05→128  123,50→124
 */
export function roundMoney(value: number): number {
  const intPart = Math.floor(value);
  const fracPart = value - intPart;
  const centavos = Math.round(fracPart * 100);

  let result: number;
  if (centavos >= 56) {
    result = intPart + 1;
  } else {
    result = intPart;
  }

  if (result % 2 !== 0) {
    result += 1;
  }

  return result;
}
