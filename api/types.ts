export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanInterval = 'MONTHLY' | 'SEMIANNUAL' | 'YEARLY';

export type SubscriptionStatus = 'PENDING' | 'AUTHORIZED' | 'PAUSED' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';

export type Subscription = {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  startDate: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserWithSubscription = User & {
  activeSubscription: Subscription | null;
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  interval: PlanInterval;
  active: boolean;
  features?: unknown;
  stripePriceId: string | null;
};

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'IN_PROCESS' | 'REJECTED' | 'REFUNDED' | 'CANCELLED';

export type Payment = {
  id: string;
  subscriptionId: string;
  stripePaymentIntentId: string | null;
  status: PaymentStatus;
  amount?: string;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};
