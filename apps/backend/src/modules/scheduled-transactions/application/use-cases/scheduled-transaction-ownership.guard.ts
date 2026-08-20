import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountRepository } from '../../../accounts/application/ports/account.repository';
import { CategoryRepository } from '../../../categories/application/ports/category.repository';

/**
 * Comprobaciones de pertenencia compartidas por los casos de uso de la agenda.
 * La cuenta y la categoría deben ser del usuario del token; nunca se aceptan
 * identificadores ajenos.
 */
export async function assertAccountOwnership(
  accounts: AccountRepository,
  accountId: string,
  userId: string,
): Promise<void> {
  const account = await accounts.findById(accountId);
  if (!account || account.userId !== userId) {
    throw new NotFoundException('Account not found');
  }
}

export async function assertCategoryOwnership(
  categories: CategoryRepository,
  categoryId: string,
  userId: string,
): Promise<void> {
  const category = await categories.findById(categoryId);
  if (!category || category.userId !== userId) {
    throw new BadRequestException('Category not found');
  }
}
