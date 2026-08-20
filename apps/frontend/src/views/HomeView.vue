<script setup lang="ts">
import DashboardSummary from '../components/organisms/DashboardSummary.vue';
import UpcomingScheduleCard from '../components/organisms/UpcomingScheduleCard.vue';
</script>

<template>
  <v-container class="py-6">
    <UpcomingScheduleCard class="mb-6" />
    <DashboardSummary />
  </v-container>
</template>
