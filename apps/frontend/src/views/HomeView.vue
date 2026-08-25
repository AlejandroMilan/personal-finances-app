<script setup lang="ts">
import { onMounted } from 'vue';
import LiquidityCard from '../components/molecules/LiquidityCard.vue';
import DashboardSummary from '../components/organisms/DashboardSummary.vue';
import UpcomingScheduleCard from '../components/organisms/UpcomingScheduleCard.vue';
import { useAccountsStore } from '../stores/accounts';

const accountsStore = useAccountsStore();

onMounted(() => {
  if (!accountsStore.loading && accountsStore.accounts.length === 0) {
    void accountsStore.fetchAccounts();
  }
});
</script>

<template>
  <v-container class="py-6">
    <UpcomingScheduleCard class="mb-6" />
    <LiquidityCard
      :accounts="accountsStore.accounts"
      :loading="accountsStore.loading"
      class="mb-6"
    />
    <DashboardSummary />
  </v-container>
</template>
