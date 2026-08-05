<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AccountCard from '../components/molecules/AccountCard.vue';
import AccountFormDialog from '../components/organisms/AccountFormDialog.vue';
import { useAccountsStore } from '../stores/accounts';
import type { AccountView, CreateAccountPayload, UpdateAccountPayload } from '../types/account';

const accountsStore = useAccountsStore();

const formOpen = ref(false);
const editingAccount = ref<AccountView | null>(null);
const deleteTarget = ref<AccountView | null>(null);
const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (value: boolean) => {
    if (!value) deleteTarget.value = null;
  },
});
const deleting = ref(false);
const deleteError = ref('');

onMounted(() => {
  void accountsStore.fetchAccounts();
});

function openCreate(): void {
  editingAccount.value = null;
  formOpen.value = true;
}

function openEdit(account: AccountView): void {
  editingAccount.value = account;
  formOpen.value = true;
}

async function handleSave(payload: CreateAccountPayload | UpdateAccountPayload): Promise<void> {
  try {
    if (editingAccount.value) {
      await accountsStore.updateAccount(editingAccount.value.id, payload);
    } else {
      await accountsStore.createAccount(payload as CreateAccountPayload);
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
    await accountsStore.deleteAccount(deleteTarget.value.id);
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
      <h1 class="text-h4 font-weight-bold">Accounts</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Add account
      </v-btn>
    </div>

    <v-progress-linear v-if="accountsStore.loading" indeterminate color="primary" class="mb-4" />

    <v-row v-if="accountsStore.accounts.length > 0" dense>
      <v-col
        v-for="account in accountsStore.accounts"
        :key="account.id"
        cols="12"
        sm="6"
        md="4"
      >
        <AccountCard
          :account="account"
          @edit="openEdit(account)"
          @delete="deleteTarget = account"
        />
      </v-col>
    </v-row>

    <v-card v-else-if="!accountsStore.loading" color="surface" class="pa-8 text-center">
      <v-icon icon="mdi-wallet-outline" size="48" color="secondary" class="mb-3" />
      <div class="text-h6">No accounts yet</div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        Create your first account to start tracking your finances.
      </div>
    </v-card>

    <AccountFormDialog v-model="formOpen" :account="editingAccount" @save="handleSave" />

    <v-dialog v-model="deleteOpen" max-width="420">
      <v-card color="surface" class="pa-6">
        <v-card-title class="text-h6 pa-0 pb-2">
          Delete account?
        </v-card-title>
        <v-card-text class="pa-0 pb-4">
          <template v-if="deleteTarget?.type === 'credit'">
            "{{ deleteTarget.name }}" and its credit card will be permanently removed.
          </template>
          <template v-else>
            "{{ deleteTarget?.name }}" will be permanently removed.
          </template>
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
