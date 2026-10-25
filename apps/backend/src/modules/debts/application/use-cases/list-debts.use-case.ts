import { Inject, Injectable } from '@nestjs/common';
import { Debt } from '../../domain/entities/debt.entity';
import { DEBT_REPOSITORY, DebtRepository } from '../ports/debt.repository';

@Injectable()
export class ListDebtsUseCase {
  constructor(
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
  ) {}

  async execute(userId: string): Promise<Debt[]> {
    return this.debtRepository.findByUserId(userId);
  }
}
