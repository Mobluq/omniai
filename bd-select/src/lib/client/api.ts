export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export async function readApi<T>(url: string, userId?: string): Promise<T> {
  const response = await fetch(url, {
    headers: userId ? { "x-bd-select-user-id": userId } : undefined,
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export async function writeApi<T>(
  url: string,
  userId: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bd-select-user-id": userId,
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export type Persona = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  kycStatus: string;
  sellerScore: number;
};

export type ListingSummary = {
  id: string;
  title: string;
  status: string;
  priceNgn: number;
  condition: string;
  description?: string | null;
  submittedAt?: string | null;
  aiAuthenticityScore?: number | null;
  aiPriceScore?: number | null;
  brand?: { id: string; name: string; tier?: string } | null;
  category?: { id: string; name: string; slug?: string } | null;
  photos?: { id: string; url: string; role: string; qualityScore?: number | null }[];
  seller?: { id: string; name: string | null; sellerScore: number };
};

export type ReviewQueueItem = {
  id: string;
  status: string;
  slaDueAt: string | null;
  aiSignals?: Record<string, unknown> | null;
  decision?: string | null;
  decisionReason?: string | null;
  listing: ListingSummary;
  assignedTo?: { id: string; name: string | null } | null;
};

export type OrderSummary = {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  escrowState: string;
  grossNgn: number;
  buyerFeeNgn: number;
  sellerFeeNgn?: number;
  authenticationFeeNgn?: number;
  paymentFeeNgn?: number;
  shippingFeeNgn: number;
  payoutNgn: number;
  createdAt?: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  listing: ListingSummary;
  buyer?: { id: string; name: string | null; email: string | null };
  seller?: { id: string; name: string | null; email: string | null; sellerScore: number };
  payments: { id: string; status: string; amountNgn: number }[];
  shipments: { id: string; status: string; courier: string; trackingNumber: string | null }[];
  disputes: { id: string; status: string; reasonCode: string }[];
  reviews: { id: string; authorId: string; targetId: string; stars: number }[];
};

export type DisputeSummary = {
  id: string;
  orderId: string | null;
  barterProposalId?: string | null;
  reasonCode: string;
  status: string;
  evidence?: Record<string, unknown> | null;
  resolution?: string | null;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  raisedBy: { id: string; name: string | null; email: string | null };
  resolvedBy?: { id: string; name: string | null; email: string | null } | null;
  order?: OrderSummary | null;
};

export type BarterProposalListingSummary = {
  proposalId: string;
  listingId: string;
  offeredById: string;
  listing: ListingSummary;
  offeredBy: { id: string; name: string | null; email: string | null };
};

export type BarterValuationSnapshot = {
  targetValueNgn?: number;
  offeredValueNgn?: number;
  deltaNgn?: number;
  topUpNgn?: number;
  topUpPayerId?: string | null;
};

export type BarterProposalSummary = {
  id: string;
  initiatorId: string;
  recipientId: string;
  targetListingId: string;
  topUpNgn: number;
  topUpPayerId: string | null;
  status: string;
  valuationSnapshot?: BarterValuationSnapshot | null;
  expiresAt: string;
  acceptedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  initiator: { id: string; name: string | null; email: string | null };
  recipient: { id: string; name: string | null; email: string | null };
  topUpPayer?: { id: string; name: string | null; email: string | null } | null;
  targetListing: ListingSummary;
  offeredListings: BarterProposalListingSummary[];
  payments?: { id: string; status: string; amountNgn: number }[];
  shipments?: { id: string; status: string; courier: string; trackingNumber: string | null }[];
  disputes?: { id: string; status: string; reasonCode: string }[];
};

export type EvidenceCategory =
  | "item_condition"
  | "authentication"
  | "delivery"
  | "payment"
  | "conversation"
  | "other";

export type EvidenceContentType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type EvidenceFileSummary = {
  id: string;
  assetId: string;
  url: string;
  category: EvidenceCategory;
  contentType: EvidenceContentType;
  byteSize: number | null;
  checksumSha256: string | null;
  uploadedById: string;
  note: string | null;
  redacted: boolean;
  attachedAt: string;
};

export type EvidenceRecordSummary = {
  version?: string;
  files?: EvidenceFileSummary[];
  countsByCategory?: Partial<Record<EvidenceCategory, number>>;
  lastAttachedAt?: string | null;
  lastAttachedById?: string | null;
};

export type EvidenceDisputeSummary = Omit<DisputeSummary, "evidence"> & {
  evidence?: EvidenceRecordSummary | null;
  barterProposal?: Partial<BarterProposalSummary> | null;
};

export type PayoutSummary = {
  id: string;
  sellerId: string;
  orderId: string;
  bankAccountTokenLast4: string;
  amountNgn: number;
  status: string;
  processorReference: string | null;
  releasedAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  seller: { id: string; name: string | null; email: string | null; sellerScore: number };
  order: OrderSummary;
};

export type MessageUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  role?: string;
  sellerScore?: number;
};

export type MessageSummary = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  redacted: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  sender: MessageUserSummary;
};

export type MessageThreadParticipantSummary = {
  id: string;
  threadId: string;
  userId: string;
  role: string;
  lastReadAt: string | null;
  createdAt: string;
  user: MessageUserSummary;
};

export type MessageThreadSummary = {
  id: string;
  orderId: string | null;
  barterProposalId: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  participants: MessageThreadParticipantSummary[];
  messages: MessageSummary[];
  order?: Partial<OrderSummary> | null;
  barterProposal?: Partial<BarterProposalSummary> | null;
};

export type NotificationSummary = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  archivedAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentEventSummary = {
  status: string;
  at: string;
  source?: string;
  note?: string;
  location?: string;
};

export type LogisticsShipmentSummary = {
  id: string;
  orderId: string | null;
  barterProposalId: string | null;
  shipperId: string | null;
  recipientId: string | null;
  courier: string;
  labelUrl: string | null;
  trackingNumber: string | null;
  status: string;
  hubCode: string | null;
  events?: ShipmentEventSummary[] | unknown;
  insuredValueNgn: number | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  risk?: "active" | "stale" | "exception" | "closed";
  shipper?: { id: string; name: string | null; email: string | null; role?: string } | null;
  recipient?: { id: string; name: string | null; email: string | null; role?: string } | null;
  order?: Partial<OrderSummary> | null;
  barterProposal?: Partial<BarterProposalSummary> | null;
};

export type LogisticsWorkspaceSummary = {
  shipments: LogisticsShipmentSummary[];
  eligibleOrders: OrderSummary[];
  eligibleBarters: BarterProposalSummary[];
};

export type SellerProfileSummary = {
  id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  bio: string | null;
  proApprovedAt: string | null;
  listingLimit: number | null;
  payoutToken?: string | null;
  defaultHubCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProTierPlanSummary = {
  tier: string;
  label: string;
  priceNgn: number;
  listingLimit: number;
  promotionCredits: number;
  supportSlaHours: number;
};

export type ProSubscriptionSummary = {
  id: string;
  sellerProfileId: string;
  tier: string;
  status: string;
  priceNgn: number;
  startsAt: string;
  endsAt: string | null;
  cancelledAt: string | null;
  processorReference: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type PromotionPlanSummary = {
  type: string;
  label: string;
  priceNgn: number;
  durationDays: number;
  description: string;
};

export type ListingPromotionSummary = {
  id: string;
  listingId: string;
  type: string;
  status: string;
  priceNgn: number;
  startsAt: string;
  endsAt: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type GrowthListingSummary = ListingSummary & {
  promotions: ListingPromotionSummary[];
};

export type SellerGrowthSummary = {
  profile: SellerProfileSummary;
  activeSubscription: ProSubscriptionSummary | null;
  subscriptions: ProSubscriptionSummary[];
  listings: GrowthListingSummary[];
  proTierPlans: ProTierPlanSummary[];
  promotionPlans: PromotionPlanSummary[];
};

export type AuditLogSummary = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  metadata?: Record<string, unknown> | null;
  signature: string | null;
  signatureVersion: string | null;
  signaturePreview: string | null;
  verified: boolean;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string | null; role: string } | null;
};

export type AuditLedgerSummary = {
  logs: AuditLogSummary[];
  stats: {
    total: number;
    signed: number;
    unsigned: number;
    filtered: number;
  };
  facets: {
    entities: { entity: string; count: number }[];
    actions: { action: string; count: number }[];
  };
};

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type RiskCategory =
  | "identity"
  | "listing"
  | "messaging"
  | "payment"
  | "logistics"
  | "dispute"
  | "barter";

export type RiskSignalSummary = {
  label: string;
  detail: string;
  weight: number;
};

export type RiskCaseSummary = {
  id: string;
  entity: string;
  entityId: string;
  category: RiskCategory;
  severity: RiskSeverity;
  score: number;
  title: string;
  summary: string;
  href: string;
  status: string;
  recommendedAction: "acknowledge" | "escalate";
  signals: RiskSignalSummary[];
  actor?: { id: string; name: string | null; email: string | null; role?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type RiskCenterSummary = {
  cases: RiskCaseSummary[];
  stats: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    open: number;
  };
  facets: {
    categories: { category: string; count: number }[];
    severities: { severity: string; count: number }[];
  };
};

export type ReportingRange = "7d" | "30d" | "90d" | "all";

export type DailyMetricSummary = {
  date: string;
  count: number;
  totalNgn: number;
};

export type InsightsBreakdownSummary = {
  label: string;
  count?: number;
  totalNgn?: number;
};

export type InsightsSummary = {
  range: ReportingRange;
  generatedAt: string;
  revenue: {
    orderCount: number;
    revenueOrderCount: number;
    completedOrderCount: number;
    gmvNgn: number;
    completedGmvNgn: number;
    escrowHeldNgn: number;
    feesNgn: number;
    averageOrderValueNgn: number;
    takeRatePercent: number;
  };
  supply: {
    createdListings: number;
    liveListings: number;
    inReviewListings: number;
    reservedListings: number;
    soldListings: number;
    totalLiveValueNgn: number;
  };
  trust: {
    activeDisputes: number;
    disputeRatePercent: number;
    evidenceFiles: number;
    redactedMessages: number;
    openReviewQueue: number;
    restrictedReviewQueue: number;
    auditSignatureCoveragePercent: number;
  };
  logistics: {
    shipments: number;
    activeShipments: number;
    deliveredShipments: number;
    exceptionShipments: number;
    staleShipments: number;
  };
  barter: {
    proposals: number;
    accepted: number;
    inReview: number;
    completed: number;
    topUpExposureNgn: number;
  };
  growth: {
    activeProSubscriptions: number;
    proSubscriptionRevenueNgn: number;
    activePromotions: number;
    promotionRevenueNgn: number;
  };
  users: {
    newUsers: number;
    buyers: number;
    sellers: number;
    verified: number;
  };
  payouts: {
    payouts: number;
    queuedNgn: number;
    paidNgn: number;
    failedNgn: number;
  };
  series: {
    dailyGmv: DailyMetricSummary[];
    dailyOrders: DailyMetricSummary[];
    dailyListings: DailyMetricSummary[];
  };
  breakdowns: {
    listingStatuses: { label: string; count: number }[];
    orderStatuses: { label: string; count: number }[];
    brandRevenue: { label: string; totalNgn: number; count: number }[];
    categoryRevenue: { label: string; totalNgn: number; count: number }[];
    topSellers: {
      sellerId: string;
      name: string | null;
      email: string | null;
      sellerScore: number;
      gmvNgn: number;
      orders: number;
    }[];
  };
};
