<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const router = useRouter();
const { mdAndUp } = useDisplay();
const drawer = ref(false);

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function logout(): void {
  auth.logout();
  void router.push({ name: 'login' });
}
</script>

<template>
  <v-app>
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-nav-icon v-if="auth.isAuthenticated" @click="drawer = !drawer" />
      <v-app-bar-title>Personal Finances App</v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-if="auth.isAuthenticated"
      v-model="drawer"
      :permanent="mdAndUp"
      color="surface"
    >
      <template #prepend>
        <v-list>
          <v-list-item
            prepend-icon="mdi-wallet"
            title="Personal Finances"
            subtitle="Your money, organized"
          />
        </v-list>
        <v-divider />
      </template>

      <v-list nav>
        <v-list-item
          to="/home"
          prepend-icon="mdi-home"
          title="Home"
          @click="drawer = false"
        />
        <v-list-item
          to="/accounts"
          prepend-icon="mdi-wallet"
          title="Accounts"
          @click="drawer = false"
        />
        <v-list-item
          to="/transactions"
          prepend-icon="mdi-swap-horizontal"
          title="Transactions"
          @click="drawer = false"
        />
        <v-list-item
          to="/categories"
          prepend-icon="mdi-tag-multiple"
          title="Categories"
          @click="drawer = false"
        />
      </v-list>

      <template #append>
        <v-divider />
        <div class="pa-4">
          <v-menu location="top" min-width="220">
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="text"
                block
                class="d-flex align-center justify-start text-none"
              >
                <v-avatar color="primary" size="36" class="mr-3">
                  <span class="text-white text-subtitle-2">
                    {{ initials(auth.user?.fullName ?? '') }}
                  </span>
                </v-avatar>
                <span class="text-body-2 font-weight-medium text-truncate">
                  {{ auth.user?.fullName }}
                </span>
                <v-icon size="small" class="ml-auto">mdi-chevron-up</v-icon>
              </v-btn>
            </template>

            <v-list density="compact">
              <v-list-item prepend-icon="mdi-logout" title="Log out" @click="logout" />
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
