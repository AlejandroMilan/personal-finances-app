import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { ListScheduledTransactionsUseCase } from './list-scheduled-transactions.use-case';
import { aScheduled, scheduledRepositoryMock } from './test-doubles';

describe('ListScheduledTransactionsUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  let useCase: ListScheduledTransactionsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListScheduledTransactionsUseCase(scheduled);
  });

  it('lists the scheduled transactions of the authenticated user', async () => {
    const items = [aScheduled()];
    scheduled.findByUserId.mockResolvedValue(items);

    await expect(useCase.execute({ userId: 'u1' })).resolves.toBe(items);
    expect(scheduled.findByUserId).toHaveBeenCalledWith('u1', {
      status: undefined,
      from: undefined,
      to: undefined,
    });
  });

  it('forwards the status and date range filters', async () => {
    scheduled.findByUserId.mockResolvedValue([]);
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-31T23:59:59.999Z');

    await useCase.execute({
      userId: 'u1',
      status: ScheduledTransactionStatus.PENDING,
      from,
      to,
    });

    expect(scheduled.findByUserId).toHaveBeenCalledWith('u1', {
      status: ScheduledTransactionStatus.PENDING,
      from,
      to,
    });
  });
});
