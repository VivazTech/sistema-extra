import { describe, it, expect } from 'vitest';
import { calculateExtraSaldo } from '../services/extraSaldoService';

describe('calculateExtraSaldo', () => {
  it('calcula corretamente o caso 1', () => {
    const result = calculateExtraSaldo(
      {
        setor: 'Restaurante',
        periodoInicio: '2025-01-01',
        periodoFim: '2025-01-31',
        quadroAprovado: 10,
        quadroEfetivo: 7,
        folgas: 2,
        domingos: 1,
        demanda: 1,
        atestado: 0,
        extrasSolicitados: 20
      },
      130
    );

    expect(result.quadroAberto).toBe(3);
    expect(result.vagasDiarias).toBe(18);
    expect(result.totalDiarias).toBe(25);
    expect(result.saldo).toBe(5);
    expect(result.valor).toBe(2600);
  });

  it('nao permite quadro aberto negativo', () => {
    const result = calculateExtraSaldo(
      {
        setor: 'Governança',
        periodoInicio: '2025-02-01',
        periodoFim: '2025-02-28',
        quadroAprovado: 5,
        quadroEfetivo: 9,
        folgas: 0,
        domingos: 0,
        demanda: 0,
        atestado: 0,
        extrasSolicitados: 0
      },
      130
    );

    expect(result.quadroAberto).toBe(0);
    expect(result.vagasDiarias).toBe(0);
    expect(result.totalDiarias).toBe(0);
  });

  it('rejeita valores negativos', () => {
    expect(() =>
      calculateExtraSaldo(
        {
          setor: 'Lazer',
          periodoInicio: '2025-03-01',
          periodoFim: '2025-03-31',
          quadroAprovado: -1,
          quadroEfetivo: 0,
          folgas: 0,
          domingos: 0,
          demanda: 0,
          atestado: 0,
          extrasSolicitados: 0
        },
        130
      )
    ).toThrow();
  });
});
