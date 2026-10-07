export interface Dashboard {
  today: { signups: number; kycDecided: number };
  queues: { kycPending: number; oldestKycHours: number | null; listingsPending: number; reportsOpen: number; fraudOpen: number };
  activePacks: Partial<Record<'essentiel' | 'confort' | 'premium', number>>;
  revenueThisMonth: Partial<Record<'pack' | 'success_fee' | 'boost', number>>;
  activeListingsByCity: Array<{ city: string; n: number }>;
  indicators: {
    activeListings: number;
    averageKycHours: number | null;
    visitRequests30d: number;
    validatedVisits30d: number;
    contactsPerListing30d: number | null;
    rentedViaKle30d: number;
    reportsPer100Listings30d: number | null;
    whatsappSharesPerListing: number | null;
    successFeePaymentRate: number | null;
  };
  successFees: Record<string, { n: number; total: number }>;
  waitlist: {
    total: number;
    byRole: Record<string, number>;
    goals: { waitlistSignups: number; landlordsReady: number; survey: Record<string, number> };
  };
}

export interface QueueItem {
  id: string;
  createdAt: string;
  dueAt: string;
  overdue: boolean;
}
