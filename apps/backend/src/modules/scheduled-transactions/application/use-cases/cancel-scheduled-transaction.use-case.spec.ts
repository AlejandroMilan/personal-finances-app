import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { CancelScheduledTransactionUseCase } from './cancel-scheduled-transaction.use-case';
import { aScheduled, scheduledRepositoryMock } from './test-doubles';

describe('CancelScheduledTransactionUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  let useCase: CancelScheduledTransactionUseCase;

  const input = { userId: 'u1', scheduledTransactionId: 's1' };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CancelScheduledTransactionUseCase(scheduled);
    scheduled.findById.mockResolvedValue(aScheduled());
    scheduled.save.mockImplementation((entity: unknown) => entity);
  });

  it('cancels a pending scheduled transaction without creating anything', async () => {
    const result = await useCase.execute(input);

    expect(result.status).toBe(ScheduledTransactionStatus.CANCELLED);
    expect(result.transactionId).toBeNull();
    expect(scheduled.save).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException when it does not exist', async () => {
    scheduled.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when it belongs to another user', async () => {
    scheduled.findById.mockResolvedValue(aScheduled({ userId: 'other' }));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it.each([
    ScheduledTransactionStatus.EXECUTED,
    ScheduledTransactionStatus.CANCELLED,
  ])('throws ConflictException when the status is %s', async (status) => {
    scheduled.findById.mockResolvedValue(aScheduled({ status }));

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(scheduled.save).not.toHaveBeenCalled();
  });

  it('rethrows unexpected repository errors', async () => {
    scheduled.save.mockRejectedValue(new Error('boom'));

    await expect(useCase.execute(input)).rejects.toThrow('boom');
  });
});
