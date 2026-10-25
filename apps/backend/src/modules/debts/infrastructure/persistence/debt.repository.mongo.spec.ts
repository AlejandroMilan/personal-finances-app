import { Debt } from '../../domain/entities/debt.entity';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { MongoDebtRepository } from './debt.repository.mongo';

describe('MongoDebtRepository', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const doc = {
    uuid: 'd1',
    userId: 'u1',
    name: 'Card',
    totalAmount: 500,
    revolving: true,
    annualInterestRate: undefined as number | undefined,
    paymentMode: DebtPaymentMode.TOTAL,
    createdAt,
    updatedAt: createdAt,
  };

  let model: Record<string, jest.Mock>;
  let repository: MongoDebtRepository;

  beforeEach(() => {
    const exec = jest.fn();
    const chain = { sort: jest.fn(() => ({ exec })), exec };
    model = {
      findOne: jest.fn(() => ({ exec })),
      find: jest.fn(() => chain),
      findOneAndUpdate: jest.fn(() => ({ exec })),
      deleteOne: jest.fn(() => ({ exec })),
      exec,
    };
    repository = new MongoDebtRepository(model as never);
  });

  it('finds a debt by id and maps the document to an entity', async () => {
    model.exec.mockResolvedValueOnce(doc);

    const debt = await repository.findById('d1');

    expect(model.findOne).toHaveBeenCalledWith({ uuid: 'd1' });
    expect(debt).toBeInstanceOf(Debt);
    expect(debt?.annualInterestRate).toBeNull();
    expect(debt?.paymentMode).toBe(DebtPaymentMode.TOTAL);
  });

  it('returns null when the debt does not exist', async () => {
    model.exec.mockResolvedValueOnce(null);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('lists the debts of a user sorted by creation date', async () => {
    model.exec.mockResolvedValueOnce([doc]);

    const debts = await repository.findByUserId('u1');

    expect(model.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(debts).toHaveLength(1);
  });

  it('upserts the debt by its uuid', async () => {
    model.exec.mockResolvedValueOnce({ ...doc, annualInterestRate: 20 });
    const debt = Debt.restore({
      id: 'd1',
      userId: 'u1',
      name: 'Card',
      totalAmount: 500,
      revolving: true,
      annualInterestRate: 20,
      paymentMode: DebtPaymentMode.TOTAL,
      createdAt,
      updatedAt: createdAt,
    });

    const saved = await repository.save(debt);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 'd1' },
      expect.objectContaining({
        $set: expect.objectContaining({ totalAmount: 500 }),
      }),
      { upsert: true, new: true },
    );
    expect(saved.annualInterestRate).toBe(20);
  });

  it('deletes a debt by its uuid', async () => {
    model.exec.mockResolvedValueOnce(undefined);
    await repository.delete('d1');
    expect(model.deleteOne).toHaveBeenCalledWith({ uuid: 'd1' });
  });
});
