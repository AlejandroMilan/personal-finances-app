<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const form = ref<{ validate: () => Promise<string[]> } | null>(null);
const fullName = ref('');
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const fullNameRules = [(value: string) => !!value.trim() || 'Full name is required'];
const emailRules = [
  (value: string) => !!value || 'Email is required',
  (value: string) => /.+@.+\..+/.test(value) || 'Enter a valid email',
];
const passwordRules = [
  (value: string) => !!value || 'Password is required',
  (value: string) => value.length >= 8 || 'Password must be at least 8 characters',
];

async function submit(): Promise<void> {
  const errors = form.value ? await form.value.validate() : [];
  if (errors.length > 0) return;

  loading.value = true;
  error.value = '';
  try {
    await auth.register(fullName.value, email.value, password.value);
    await router.push({ name: 'login', query: { registered: '1' } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card width="420" class="pa-8" color="surface">
      <v-card-title class="text-h4 text-center font-weight-bold mb-2">
        Create your account
      </v-card-title>
      <v-card-subtitle class="text-center mb-4">
        Start managing your personal finances
      </v-card-subtitle>

      <v-alert v-if="error" type="error" class="mb-4">
        {{ error }}
      </v-alert>

      <v-form ref="form" @submit.prevent="submit">
        <v-text-field
          v-model="fullName"
          label="Full name"
          prepend-icon="mdi-account"
          :rules="fullNameRules"
        />
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          prepend-icon="mdi-email"
          :rules="emailRules"
        />
        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          prepend-icon="mdi-lock"
          :rules="passwordRules"
        />
        <v-btn type="submit" color="primary" block class="mt-4" :loading="loading">
          Create account
        </v-btn>
      </v-form>

      <p class="text-center mt-4 mb-0">
        Already have an account?
        <router-link to="/login" class="text-primary">Sign in</router-link>
      </p>
    </v-card>
  </v-container>
</template>
