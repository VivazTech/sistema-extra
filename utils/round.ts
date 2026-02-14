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
 * Arredonda valor monetário para reais inteiros (xxx,00) com regra específica para facilitar pagamento:
 *
 * 1. Centavos >= 51 → arredonda para cima (100,51 → 101,00)
 * 2. Centavos <= 50 → arredonda para baixo (100,50 → 100,00)
 * 3. Se resultado ímpar 1 ou 3 → sobe para par (101→102, 103→104)
 *    Ímpares 5, 7 e 9 ficam como estão (pagáveis: 5 tem nota, 7=5+2, 9=5+2+2)
 *
 * Exemplos: 100,51→102  100,50→100  101,00→102  103,00→104  105,00→105  127,00→127
 */
export function roundMoney(value: number): number {
  const intPart = Math.floor(value);
  const fracPart = value - intPart;
  const centavos = Math.round(fracPart * 100);

  let result: number;
  if (centavos >= 51) {
    result = intPart + 1;
  } else {
    result = intPart;
  }

  const ultimoDigito = result % 10;
  if (ultimoDigito === 1 || ultimoDigito === 3) {
    result += 1;
  }

  return result;
}
