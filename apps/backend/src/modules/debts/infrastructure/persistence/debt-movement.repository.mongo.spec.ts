import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { MongoDebtMovementRepository } from './debt-movement.repository.mongo';

describe('MongoDebtMovementRepository', () => {
  const occurredAt = new Date('2026-01-01T00:00:00.000Z');
  const doc = {
    uuid: 'm1',
    userId: 'u1',
    debtId: 'd1',
    kind: DebtMovementKind.PAYMENT,
    delta: -100,
    amount: 120,
    capitalAmount: 100,
    interestAmount: 20,
    transactionId: undefined as string | undefined,
    occurredAt,
    createdAt: occurredAt,
  };

  let model: Record<string, jest.Mock>;
  let repository: MongoDebtMovementRepository;

  beforeEach(() => {
    const exec = jest.fn();
    model = {
      find: jest.fn(() => ({ exec })),
      findOneAndUpdate: jest.fn(() => ({ exec })),
      deleteMany: jest.fn(() => ({ exec })),
      deleteOne: jest.fn(() => ({ exec })),
      exec,
    };
    repository = new MongoDebtMovementRepository(model as never);
  });

  it('lists movements by user and by debt', async () => {
    model.exec.mockResolvedValue([doc]);

    const byUser = await repository.findByUserId('u1');
    const byDebt = await repository.findByDebtId('d1');

    expect(model.find).toHaveBeenNthCalledWith(1, { userId: 'u1' });
    expect(model.find).toHaveBeenNthCalledWith(2, { debtId: 'd1' });
    expect(byUser[0]).toBeInstanceOf(DebtMovement);
    expect(byDebt[0].transactionId).toBeNull();
  });

  it('upserts a movement by its uuid', async () => {
    model.exec.mockResolvedValueOnce({ ...doc, transactionId: 't1' });
    const movement = DebtMovement.restore({
      id: 'm1',
      userId: 'u1',
      debtId: 'd1',
      kind: DebtMovementKind.PAYMENT,
      delta: -100,
      amount: 120,
      capitalAmount: 100,
      interestAmount: 20,
      transactionId: 't1',
      occurredAt,
      createdAt: occurredAt,
    });

    const saved = await repository.save(movement);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'm1' },
      expect.objectContaining({
        $set: expect.objectContaining({ transactionId: 't1' }),
      }),
      { upsert: true, new: true },
    );
    expect(saved.transactionId).toBe('t1');
  });

  it('deletes every movement of a debt', async () => {
    model.exec.mockResolvedValueOnce(undefined);
    await repository.deleteByDebtId('d1');
    expect(model.deleteMany).toHaveBeenCalledWith({ debtId: 'd1' });
  });

  it('finds the movements created by a transaction', async () => {
    model.exec.mockResolvedValueOnce([doc]);

    const movements = await repository.findByTransactionId('t1');

    expect(model.find).toHaveBeenCalledWith({ transactionId: 't1' });
    expect(movements).toHaveLength(1);
  });

  it('deletes one movement by its uuid', async () => {
    model.exec.mockResolvedValueOnce(undefined);
    await repository.deleteById('m1');
    expect(model.deleteOne).toHaveBeenCalledWith({ uuid: 'm1' });
  });
});
