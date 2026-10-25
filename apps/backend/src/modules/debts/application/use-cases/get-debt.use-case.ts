import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Debt } from '../../domain/entities/debt.entity';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

@Injectable()
export class GetDebtUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
  ) {}

  async execute(userId: string, debtId: string): Promise<Debt> {
    const debt = await this.debtRepository.findById(debtId);
    if (!debt || debt.userId !== userId) {
      throw new NotFoundException('Debt not found');
    }
    return debt;
  }
}
