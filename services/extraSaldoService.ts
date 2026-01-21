import { ExtraSaldoInput, ExtraSaldoResult } from '../types';

const roundMoney = (value: number) => Number(value.toFixed(2));

const validateNonNegative = (value: number, field: string) => {
  if (value < 0) {
    throw new Error(`Campo inválido: ${field} não pode ser negativo.`);
  }
};

export const calculateExtraSaldo = (input: ExtraSaldoInput, valorDiaria: number): ExtraSaldoResult => {
  const {
    quadroAprovado,
    quadroEfetivo,
    folgas,
    domingos,
    demanda,
    atestado,
    extrasSolicitados
  } = input;

  [
    ['quadro_aprovado', quadroAprovado],
    ['quadro_efetivo', quadroEfetivo],
    ['folgas', folgas],
    ['domingos', domingos],
    ['demanda', demanda],
    ['atestado', atestado],
    ['extras_solicitados', extrasSolicitados],
    ['valor_diaria', valorDiaria]
  ].forEach(([field, value]) => validateNonNegative(value as number, field as string));

  const quadroAberto = Math.max(0, quadroAprovado - quadroEfetivo);
  const vagasDiarias = quadroAberto * 6;
  const totalDiarias = quadroAberto + folgas + domingos + vagasDiarias + demanda + atestado;
  const saldo = totalDiarias - extrasSolicitados;
  const valor = roundMoney(extrasSolicitados * valorDiaria);
  const saldoEmReais = roundMoney(saldo * valorDiaria * -1);

  return {
    quadroAberto,
    vagasDiarias,
    totalDiarias,
    saldo,
    valorDiaria,
    valor,
    saldoEmReais
  };
};
