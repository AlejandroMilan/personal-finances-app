<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import TransactionFormDialog from '../components/organisms/TransactionFormDialog.vue';
import { useAccountsStore } from '../stores/accounts';
import { useCategoriesStore } from '../stores/categories';
import { useTransactionsStore } from '../stores/transactions';
import type {
  CreateTransactionPayload,
  TransactionType,
  TransactionView,
  UpdateTransactionPayload,
} from '../types/transaction';
import {
  getAccountName,
  getTransactionAmountLabel,
  getTransactionTypeColor,
  getTransactionTypeLabel,
  getTransferLabel,
  transactionTypeOptions,
} from '../utils/transaction';

const transactionsStore = useTransactionsStore();
const accountsStore = useAccountsStore();
const categoriesStore = useCategoriesStore();

const page = ref(1);
const pageSize = ref(20);

const filters = ref({
  accountId: undefined as string | undefined,
  categoryId: undefined as string | undefined,
  type: undefined as TransactionType | undefined,
  title: '',
  from: '',
  to: '',
});

const formOpen = ref(false);
const editingTransaction = ref<TransactionView | null>(null);
const deleteTarget = ref<TransactionView | null>(null);
const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (value: boolean) => {
    if (!value) deleteTarget.value = null;
  },
});
const deleting = ref(false);
const deleteError = ref('');

const headers = [
  { title: 'Date', key: 'timestamp' },
  { title: 'Title', key: 'title' },
  { title: 'Account', key: 'accountId' },
  { title: 'Category', key: 'categoryId' },
  { title: 'Tags', key: 'tags' },
  { title: 'Type', key: 'type' },
  { title: 'Amount', key: 'amount', align: 'end' as const },
  { title: '', key: 'actions', align: 'end' as const, sortable: false },
];

const typeOptions = transactionTypeOptions;

onMounted(() => {
  void transactionsStore.fetchTransactions();
  void accountsStore.fetchAccounts();
  void categoriesStore.fetchCategories();
});

watch(page, (value) => {
  void transactionsStore.setPage(value);
});

watch(pageSize, (value) => {
  page.value = 1;
  void transactionsStore.applyFilters({ limit: value });
});

function applyFilters(): void {
  void transactionsStore.applyFilters({
    accountId: filters.value.accountId,
    categoryId: filters.value.categoryId,
    type: filters.value.type,
    title: filters.value.title.trim() || undefined,
    from: filters.value.from || undefined,
    to: filters.value.to || undefined,
  });
  page.value = 1;
}

function clearFilters(): void {
  filters.value = { accountId: undefined, categoryId: undefined, type: undefined, title: '', from: '', to: '' };
  applyFilters();
}

function accountName(transaction: TransactionView): string {
  return getAccountName(accountsStore.accounts, transaction.accountId);
}

function transferLabel(transaction: TransactionView): string {
  return getTransferLabel(transaction, accountsStore.accounts);
}

function categoryLabel(transaction: TransactionView): string {
  if (!transaction.categoryId) return '—';
  return categoriesStore.categories.find((category) => category.id === transaction.categoryId)?.name ?? 'Uncategorized';
}

function categoryColor(transaction: TransactionView): string | undefined {
  if (!transaction.categoryId) return undefined;
  return categoriesStore.categories.find((category) => category.id === transaction.categoryId)?.color;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function amountLabel(transaction: TransactionView): string {
  return getTransactionAmountLabel(transaction);
}

function openCreate(): void {
  editingTransaction.value = null;
  formOpen.value = true;
}

function openEdit(transaction: TransactionView): void {
  editingTransaction.value = transaction;
  formOpen.value = true;
}

async function handleSave(
  payload: CreateTransactionPayload | UpdateTransactionPayload,
): Promise<void> {
  try {
    if (editingTransaction.value) {
      await transactionsStore.updateTransaction(editingTransaction.value.id, payload);
    } else {
      await transactionsStore.createTransaction(payload as CreateTransactionPayload);
    }
    formOpen.value = false;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed';
    window.alert(message);
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await transactionsStore.deleteTransaction(deleteTarget.value.id);
    deleteTarget.value = null;
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : 'Delete failed';
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <v-container class="py-6">
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">Transactions</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Add transaction
      </v-btn>
    </div>

    <v-card color="surface" class="pa-4 mb-4">
      <v-row dense align="end">
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filters.accountId"
            label="Account"
            :items="accountsStore.accounts"
            item-title="name"
            item-value="id"
            clearable
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="6" sm="4" md="2">
          <v-select
            v-model="filters.type"
            label="Type"
            :items="typeOptions"
            item-title="label"
            item-value="value"
            clearable
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-select
            v-model="filters.categoryId"
            label="Category"
            :items="categoriesStore.categories"
            item-title="name"
            item-value="id"
            clearable
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="filters.title"
            label="Search title"
            prepend-inner-icon="mdi-magnify"
            clearable
            @keydown.enter="applyFilters"
            @click:clear="applyFilters"
          />
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-text-field
            v-model="filters.from"
            label="From"
            type="date"
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-text-field
            v-model="filters.to"
            label="To"
            type="date"
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="12" sm="4" md="2">
          <v-btn variant="text" prepend-icon="mdi-close" @click="clearFilters">
            Clear
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-data-table
      :headers="headers"
      :items="transactionsStore.items"
      :items-length="transactionsStore.total"
      :loading="transactionsStore.loading"
      v-model:page="page"
      :items-per-page="pageSize"
      :items-per-page-options="[10, 20, 50]"
      disable-sort
      item-value="id"
      class="elevation-1 rounded"
    >
      <template #[`item.timestamp`]="{ item }">
        {{ formatDate(item.timestamp) }}
      </template>
      <template #[`item.title`]="{ item }">
        <span class="font-weight-medium">{{ item.title }}</span>
      </template>
      <template #[`item.accountId`]="{ item }">
        <span v-if="item.type === 'transfer'">{{ transferLabel(item) }}</span>
        <span v-else>{{ accountName(item) }}</span>
      </template>
      <template #[`item.categoryId`]="{ item }">
        <v-chip
          v-if="item.categoryId"
          size="small"
          variant="tonal"
          :color="categoryColor(item) ?? 'secondary'"
        >
          {{ categoryLabel(item) }}
        </v-chip>
        <span v-else class="text-medium-emphasis">—</span>
      </template>
      <template #[`item.tags`]="{ item }">
        <v-chip
          v-for="tag in item.tags"
          :key="tag"
          size="small"
          variant="flat"
          class="mr-1"
        >
          {{ tag }}
        </v-chip>
        <span v-if="item.tags.length === 0" class="text-medium-emphasis">—</span>
      </template>
      <template #[`item.type`]="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="getTransactionTypeColor(item.type)"
        >
          {{ getTransactionTypeLabel(item.type) }}
        </v-chip>
      </template>
      <template #[`item.amount`]="{ item }">
        <span
          class="font-weight-medium"
          :class="{
            'text-success': item.type === 'income',
            'text-error': item.type === 'expense',
            'text-primary': item.type === 'transfer',
          }"
        >
          {{ amountLabel(item) }}
        </span>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn
          icon="mdi-delete"
          variant="text"
          size="small"
          color="error"
          @click="deleteTarget = item"
        />
      </template>
    </v-data-table>

    <TransactionFormDialog v-model="formOpen" :transaction="editingTransaction" @save="handleSave" />

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card color="surface" class="pa-6">
        <v-card-title class="text-h6 pa-0 pb-2">
          Delete transaction?
        </v-card-title>
        <v-card-text class="pa-0 pb-4">
          "{{ deleteTarget?.title }}" will be permanently removed and its effect on the account balance will be reverted.
        </v-card-text>
        <v-alert v-if="deleteError" type="error" class="mb-4">{{ deleteError }}</v-alert>
        <div class="d-flex justify-end">
          <v-btn variant="text" class="mr-2" :disabled="deleting" @click="deleteTarget = null">
            Cancel
          </v-btn>
          <v-btn color="error" :loading="deleting" @click="confirmDelete">
            Delete
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>
</template>
