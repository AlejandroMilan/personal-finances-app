import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { BudgetsModule } from './modules/budgets/budgets.module';

describe('AppModule', () => {
  it('registers BudgetsModule in the application module imports', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toContain(BudgetsModule);
  });
});
