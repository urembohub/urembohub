export const QUEUE_NAMES = {
  COMMISSION_RECONCILIATION: 'commission-reconciliation',
  COMMISSION_PROCESSING: 'commission-processing',
  PAYMENT_VERIFICATION: 'payment-verification',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  PACKAGE_TRACKING: 'package-tracking', // Added package tracking queue
  // Future queues can be added here
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
