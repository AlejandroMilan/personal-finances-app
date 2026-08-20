import { BadRequestException } from '@nestjs/common';
import { TransactionsSummary } from '../ports/transaction.repository';
import { GetTransactionsSummaryUseCase } from './get-transactions-summary.use-case';

describe('GetTransactionsSummaryUseCase', () => {
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
    summarize: jest.fn(),
  };
  let useCase: GetTransactionsSummaryUseCase;

  const emptySummary: TransactionsSummary = {
    totals: { income: 0, expense: 0 },
    byCategory: { income: [], expense: [] },
    series: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionRepository.summarize.mockResolvedValue(emptySummary);
    useCase = new GetTransactionsSummaryUseCase(transactionRepository);
  });

  it('delegates the aggregation to the repository with the received user', async () => {
    const from = new Date('2026-08-01T06:00:00.000Z');
    const to = new Date('2026-08-31T05:59:59.999Z');

    const result = await useCase.execute({
      userId: 'u1',
      from,
      to,
      granularity: 'day',
      timeZone: 'America/Mexico_City',
    });

    expect(transactionRepository.summarize).toHaveBeenCalledWith('u1', {
      from,
      to,
      granularity: 'day',
      timeZone: 'America/Mexico_City',
    });
    expect(result).toBe(emptySummary);
  });

  it('falls back to UTC when no time zone is provided', async () => {
    await useCase.execute({
      userId: 'u1',
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-02T00:00:00.000Z'),
      granularity: 'day',
    });

    expect(transactionRepository.summarize).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ timeZone: 'UTC' }),
    );
  });

  it('rejects a range whose start is after its end', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('2026-08-31T00:00:00.000Z'),
        to: new Date('2026-08-01T00:00:00.000Z'),
        granularity: 'day',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(transactionRepository.summarize).not.toHaveBeenCalled();
  });

  it('rejects invalid dates without hitting the database', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('not-a-date'),
        to: new Date('2026-08-01T00:00:00.000Z'),
        granularity: 'day',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(transactionRepository.summarize).not.toHaveBeenCalled();
  });

  it('rejects an hour granularity over a range of months', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-12-31T00:00:00.000Z'),
        granularity: 'hour',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(transactionRepository.summarize).not.toHaveBeenCalled();
  });

  it('rejects a month granularity over a range of decades', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('1990-01-01T00:00:00.000Z'),
        to: new Date('2026-01-01T00:00:00.000Z'),
        granularity: 'month',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts a whole year with a month granularity', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('2026-01-01T00:00:00.000Z'),
        to: new Date('2026-12-31T23:59:59.999Z'),
        granularity: 'month',
      }),
    ).resolves.toBe(emptySummary);
  });

  it('accepts a single day with an hour granularity', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        from: new Date('2026-08-20T06:00:00.000Z'),
        to: new Date('2026-08-21T05:59:59.999Z'),
        granularity: 'hour',
      }),
    ).resolves.toBe(emptySummary);
  });
});
