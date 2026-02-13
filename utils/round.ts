/**
 * Regra de arredondamento: abaixo de 0,50 arredonda para baixo; 0,50 ou acima arredonda para cima.
 * Usado em valores derivados de horas trabalhadas (sistema e PDF).
 */

/** Arredonda horas para inteiro: parte fracionária < 0,50 → baixo, >= 0,50 → cima. Ex: 7,4 → 7; 7,5 → 8. */
export function roundHoursToInteger(hours: number): number {
  return Math.round(hours);
}

/** Arredonda horas para 1 casa decimal com a mesma regra. Ex: 7,34 → 7,3; 7,36 → 7,4. */
export function roundHoursToOneDecimal(hours: number): number {
  return Math.round(hours * 10) / 10;
}

/** Arredonda valor monetário para 2 casas decimais (centavos): < 0,50 no próximo decimal → baixo, >= 0,50 → cima. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
