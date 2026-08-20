import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { DeleteScheduledTransactionUseCase } from './delete-scheduled-transaction.use-case';
import { aScheduled, scheduledRepositoryMock } from './test-doubles';

describe('DeleteScheduledTransactionUseCase', () => {
  const scheduled = scheduledRepositoryMock();
  let useCase: DeleteScheduledTransactionUseCase;

  const input = { userId: 'u1', scheduledTransactionId: 's1' };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteScheduledTransactionUseCase(scheduled);
    scheduled.findById.mockResolvedValue(aScheduled());
  });

  it('deletes a pending scheduled transaction', async () => {
    await useCase.execute(input);

    expect(scheduled.deleteById).toHaveBeenCalledWith('s1');
  });

  it('throws NotFoundException when it does not exist', async () => {
    scheduled.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(scheduled.deleteById).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when it belongs to another user', async () => {
    scheduled.findById.mockResolvedValue(aScheduled({ userId: 'other' }));

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
    expect(scheduled.deleteById).not.toHaveBeenCalled();
  });

  it.each([
    ScheduledTransactionStatus.EXECUTED,
    ScheduledTransactionStatus.CANCELLED,
  ])('throws ConflictException when the status is %s', async (status) => {
    scheduled.findById.mockResolvedValue(aScheduled({ status }));

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    expect(scheduled.deleteById).not.toHaveBeenCalled();
  });
});
