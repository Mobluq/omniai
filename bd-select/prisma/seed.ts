import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { toSlug } from "@/lib/naming/slug";
import { sanitizeUserText } from "@/lib/security/request-context";
import { hasMarketplacePii, redactMarketplacePii } from "@/lib/security/redaction";
import { auditSignatureVersion, signAuditLog } from "@/modules/marketplace/audit-policy";
import { evidenceRecordVersion } from "@/modules/marketplace/evidence-policy";
import { calculateBarterValuation } from "@/modules/marketplace/barter-policy";
import { calculateOrderQuote } from "@/modules/marketplace/pricing";

const prisma = new PrismaClient();

const categories = [
  "Menswear",
  "Womenswear",
  "Accessories",
  "Sneakers",
  "Watches",
  "Jewellery",
  "Leather goods",
  "Archive",
  "Denim",
];

const brands = [
  { name: "Louis Vuitton", tier: "luxury", restricted: true },
  { name: "Chanel", tier: "luxury", restricted: true },
  { name: "Hermes", tier: "luxury", restricted: true },
  { name: "Maison Margiela", tier: "designer", restricted: false },
  { name: "Nike", tier: "streetwear", restricted: false },
  { name: "Adidas", tier: "streetwear", restricted: false },
  { name: "Orange Culture", tier: "designer", restricted: false },
  { name: "Mowalola", tier: "designer", restricted: false },
] as const;

const demoUsers = [
  {
    email: "buyer@bdselect.local",
    name: "Tomi Buyer",
    role: "buyer",
    kycStatus: "verified",
  },
  {
    email: "seller@bdselect.local",
    name: "Ada Seller",
    role: "seller",
    kycStatus: "verified",
  },
  {
    email: "trader@bdselect.local",
    name: "Kene Trader",
    role: "seller",
    kycStatus: "verified",
  },
  {
    email: "authenticator@bdselect.local",
    name: "Femi Authenticator",
    role: "authenticator",
    kycStatus: "verified",
  },
  {
    email: "admin@bdselect.local",
    name: "Zainab Admin",
    role: "admin",
    kycStatus: "verified",
  },
] as const;

const demoPhotos = ["front", "back", "label", "defect", "sole", "packaging"] as const;

async function seedTaxonomy() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: toSlug(name) },
      create: { name, slug: toSlug(name) },
      update: { name },
    });
  }

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: toSlug(brand.name) },
      create: {
        name: brand.name,
        slug: toSlug(brand.name),
        tier: brand.tier,
        restricted: brand.restricted,
      },
      update: {
        name: brand.name,
        tier: brand.tier,
        restricted: brand.restricted,
      },
    });
  }
}

async function seedDemoData() {
  const passwordHash = await bcrypt.hash("bd-select-demo-password", 12);

  for (const demoUser of demoUsers) {
    await prisma.user.upsert({
      where: { email: demoUser.email },
      create: {
        email: demoUser.email,
        name: demoUser.name,
        passwordHash,
        emailVerified: new Date(),
        role: demoUser.role,
        kycStatus: demoUser.kycStatus,
      },
      update: {
        name: demoUser.name,
        role: demoUser.role,
        kycStatus: demoUser.kycStatus,
      },
    });
  }

  const seller = await prisma.user.findUniqueOrThrow({ where: { email: "seller@bdselect.local" } });
  const trader = await prisma.user.findUniqueOrThrow({ where: { email: "trader@bdselect.local" } });
  const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@bdselect.local" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@bdselect.local" } });
  await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    create: {
      userId: seller.id,
      storeName: "Ada's Curated Closet",
      storeSlug: "adas-curated-closet",
      bio: "Premium Lagos wardrobe edits: denim, sneakers, leather goods, and contemporary designers.",
      payoutToken: "demo_payout_token_seller",
      defaultHubCode: "lekki-phase-1",
    },
    update: {
      storeName: "Ada's Curated Closet",
      bio: "Premium Lagos wardrobe edits: denim, sneakers, leather goods, and contemporary designers.",
      payoutToken: "demo_payout_token_seller",
      defaultHubCode: "lekki-phase-1",
    },
  });
  await prisma.sellerProfile.upsert({
    where: { userId: trader.id },
    create: {
      userId: trader.id,
      storeName: "Kene's Swap Rack",
      storeSlug: "kenes-swap-rack",
      bio: "Authenticated swap-first wardrobe: Nigerian designers, sneakers, and premium accessories.",
      payoutToken: "demo_payout_token_trader",
      defaultHubCode: "wuse-2",
    },
    update: {
      storeName: "Kene's Swap Rack",
      bio: "Authenticated swap-first wardrobe: Nigerian designers, sneakers, and premium accessories.",
      payoutToken: "demo_payout_token_trader",
      defaultHubCode: "wuse-2",
    },
  });

  const denim = await prisma.category.findUniqueOrThrow({ where: { slug: "denim" } });
  const menswear = await prisma.category.findUniqueOrThrow({ where: { slug: "menswear" } });
  const accessories = await prisma.category.findUniqueOrThrow({ where: { slug: "accessories" } });
  const sneakers = await prisma.category.findUniqueOrThrow({ where: { slug: "sneakers" } });
  const leatherGoods = await prisma.category.findUniqueOrThrow({
    where: { slug: "leather-goods" },
  });
  const margiela = await prisma.brand.findUniqueOrThrow({ where: { slug: "maison-margiela" } });
  const nike = await prisma.brand.findUniqueOrThrow({ where: { slug: "nike" } });
  const adidas = await prisma.brand.findUniqueOrThrow({ where: { slug: "adidas" } });
  const louisVuitton = await prisma.brand.findUniqueOrThrow({ where: { slug: "louis-vuitton" } });
  const orangeCulture = await prisma.brand.findUniqueOrThrow({ where: { slug: "orange-culture" } });
  const mowalola = await prisma.brand.findUniqueOrThrow({ where: { slug: "mowalola" } });

  const listings = [
    {
      title: "Maison Margiela raw denim jacket",
      slug: "maison-margiela-raw-denim-jacket",
      brandId: margiela.id,
      categoryId: denim.id,
      condition: "excellent",
      priceNgn: 185_000,
      status: "live",
      approvedAt: new Date(),
    },
    {
      title: "Nike Air Max 95 Lagos edit",
      slug: "nike-air-max-95-lagos-edit",
      brandId: nike.id,
      categoryId: sneakers.id,
      condition: "good",
      priceNgn: 92_000,
      status: "live",
      approvedAt: new Date(),
    },
    {
      title: "Adidas Spezial track jacket",
      slug: "adidas-spezial-track-jacket",
      brandId: adidas.id,
      categoryId: menswear.id,
      condition: "excellent",
      priceNgn: 118_000,
      status: "live",
      approvedAt: new Date(),
    },
    {
      title: "Mowalola vinyl mini bag",
      slug: "mowalola-vinyl-mini-bag",
      brandId: mowalola.id,
      categoryId: accessories.id,
      condition: "excellent",
      priceNgn: 215_000,
      status: "live",
      approvedAt: new Date(),
    },
    {
      title: "Louis Vuitton Epi leather card holder",
      slug: "louis-vuitton-epi-leather-card-holder",
      brandId: louisVuitton.id,
      categoryId: leatherGoods.id,
      condition: "excellent",
      priceNgn: 310_000,
      status: "in_review",
      approvedAt: null,
    },
  ] as const;

  for (const listingSeed of listings) {
    const listing = await prisma.listing.upsert({
      where: { sellerId_slug: { sellerId: seller.id, slug: listingSeed.slug } },
      create: {
        sellerId: seller.id,
        title: listingSeed.title,
        slug: listingSeed.slug,
        description: "Seeded BD Select demo listing with complete review-ready media.",
        brandId: listingSeed.brandId,
        categoryId: listingSeed.categoryId,
        condition: listingSeed.condition,
        priceNgn: listingSeed.priceNgn,
        status: listingSeed.status,
        approvedAt: listingSeed.approvedAt,
        submittedAt: listingSeed.status === "in_review" ? new Date() : null,
        aiAuthenticityScore: 82,
        aiPriceScore: 76,
      },
      update: {
        title: listingSeed.title,
        brandId: listingSeed.brandId,
        categoryId: listingSeed.categoryId,
        condition: listingSeed.condition,
        priceNgn: listingSeed.priceNgn,
        status: listingSeed.status,
        approvedAt: listingSeed.approvedAt,
      },
    });

    await prisma.listingPhoto.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingPhoto.createMany({
      data: demoPhotos.map((role, index) => ({
        listingId: listing.id,
        role,
        url: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80&ixid=bd-select-${listingSeed.slug}-${role}`,
        qualityScore: 88 - index,
        sortOrder: index,
      })),
    });

    if (listingSeed.status === "in_review") {
      await prisma.reviewQueueItem.upsert({
        where: { id: `demo-review-${listingSeed.slug}` },
        create: {
          id: `demo-review-${listingSeed.slug}`,
          listingId: listing.id,
          status: "queued",
          slaDueAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
          aiSignals: { authenticityScore: 82, priceScore: 76, seeded: true },
        },
        update: {
          status: "queued",
          slaDueAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      });
    }
  }

  const traderListing = await prisma.listing.upsert({
    where: { sellerId_slug: { sellerId: trader.id, slug: "orange-culture-embroidered-bomber" } },
    create: {
      sellerId: trader.id,
      title: "Orange Culture embroidered bomber",
      slug: "orange-culture-embroidered-bomber",
      description: "Seeded BD Select barter-ready listing from the second demo seller.",
      brandId: orangeCulture.id,
      categoryId: denim.id,
      condition: "excellent",
      priceNgn: 176_000,
      status: "live",
      approvedAt: new Date(),
      aiAuthenticityScore: 87,
      aiPriceScore: 80,
    },
    update: {
      title: "Orange Culture embroidered bomber",
      brandId: orangeCulture.id,
      categoryId: denim.id,
      condition: "excellent",
      priceNgn: 176_000,
      status: "live",
      approvedAt: new Date(),
    },
  });

  await prisma.listingPhoto.deleteMany({ where: { listingId: traderListing.id } });
  await prisma.listingPhoto.createMany({
    data: demoPhotos.map((role, index) => ({
      listingId: traderListing.id,
      role,
      url: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80&ixid=bd-select-orange-culture-bomber-${role}`,
      qualityScore: 91 - index,
      sortOrder: index,
    })),
  });

  const sellerProfile = await prisma.sellerProfile.findUniqueOrThrow({
    where: { userId: seller.id },
  });
  const margielaListing = await prisma.listing.findUniqueOrThrow({
    where: { sellerId_slug: { sellerId: seller.id, slug: "maison-margiela-raw-denim-jacket" } },
  });
  const nikeListing = await prisma.listing.findUniqueOrThrow({
    where: { sellerId_slug: { sellerId: seller.id, slug: "nike-air-max-95-lagos-edit" } },
  });
  const evidenceQuote = calculateOrderQuote(nikeListing.priceNgn, 2_500);
  const evidenceOrder = await prisma.order.upsert({
    where: { id: "demo-order-evidence-nike" },
    create: {
      id: "demo-order-evidence-nike",
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: nikeListing.id,
      grossNgn: evidenceQuote.grossNgn,
      buyerFeeNgn: evidenceQuote.buyerFeeNgn,
      sellerFeeNgn: evidenceQuote.sellerFeeNgn,
      authenticationFeeNgn: evidenceQuote.authenticationFeeNgn,
      paymentFeeNgn: evidenceQuote.paymentFeeNgn,
      shippingFeeNgn: evidenceQuote.shippingFeeNgn,
      payoutNgn: evidenceQuote.payoutNgn,
      status: "disputed",
      escrowState: "held",
      paidAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      metadata: { seeded: true, buyerTotalNgn: evidenceQuote.buyerTotalNgn },
    },
    update: {
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: nikeListing.id,
      grossNgn: evidenceQuote.grossNgn,
      buyerFeeNgn: evidenceQuote.buyerFeeNgn,
      sellerFeeNgn: evidenceQuote.sellerFeeNgn,
      authenticationFeeNgn: evidenceQuote.authenticationFeeNgn,
      paymentFeeNgn: evidenceQuote.paymentFeeNgn,
      shippingFeeNgn: evidenceQuote.shippingFeeNgn,
      payoutNgn: evidenceQuote.payoutNgn,
      status: "disputed",
      escrowState: "held",
      metadata: { seeded: true, buyerTotalNgn: evidenceQuote.buyerTotalNgn },
    },
  });
  await prisma.listing.update({
    where: { id: nikeListing.id },
    data: { status: "reserved" },
  });
  await prisma.payment.upsert({
    where: { reference: "demo-payment-evidence-nike" },
    create: {
      orderId: evidenceOrder.id,
      processor: "manual",
      reference: "demo-payment-evidence-nike",
      amountNgn: evidenceQuote.buyerTotalNgn,
      status: "paid",
      channel: "transfer",
      paidAt: evidenceOrder.paidAt ?? new Date(),
      metadata: { seeded: true },
    },
    update: {
      orderId: evidenceOrder.id,
      amountNgn: evidenceQuote.buyerTotalNgn,
      status: "paid",
      paidAt: evidenceOrder.paidAt ?? new Date(),
      metadata: { seeded: true },
    },
  });
  await prisma.shipment.upsert({
    where: { id: "demo-shipment-evidence-nike" },
    create: {
      id: "demo-shipment-evidence-nike",
      orderId: evidenceOrder.id,
      shipperId: seller.id,
      recipientId: buyer.id,
      courier: "gig",
      trackingNumber: "GIG-BD-EVIDENCE-001",
      status: "delivered",
      hubCode: "lekki-phase-1",
      deliveredAt: evidenceOrder.deliveredAt,
      events: [
        { status: "in_transit", at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
        { status: "delivered", at: (evidenceOrder.deliveredAt ?? new Date()).toISOString() },
      ],
    },
    update: {
      orderId: evidenceOrder.id,
      shipperId: seller.id,
      recipientId: buyer.id,
      courier: "gig",
      trackingNumber: "GIG-BD-EVIDENCE-001",
      status: "delivered",
      hubCode: "lekki-phase-1",
      deliveredAt: evidenceOrder.deliveredAt,
      events: [
        { status: "in_transit", at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString() },
        { status: "delivered", at: (evidenceOrder.deliveredAt ?? new Date()).toISOString() },
      ],
    },
  });

  const evidenceAsset = await prisma.mediaAsset.upsert({
    where: { id: "demo-evidence-media-sole-wear" },
    create: {
      id: "demo-evidence-media-sole-wear",
      ownerId: buyer.id,
      status: "attached",
      storageKey: `users/${buyer.id}/evidence/demo-sole-wear.jpg`,
      publicUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80&ixid=bd-select-evidence",
      contentType: "image/jpeg",
      byteSize: 488_000,
      width: 1600,
      height: 1200,
      qualityScore: 100,
      uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      metadata: { provider: "seed", purpose: "evidence", disputeId: "demo-dispute-evidence-nike" },
    },
    update: {
      ownerId: buyer.id,
      status: "attached",
      publicUrl:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80&ixid=bd-select-evidence",
      contentType: "image/jpeg",
      byteSize: 488_000,
      width: 1600,
      height: 1200,
      qualityScore: 100,
      uploadedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      metadata: { provider: "seed", purpose: "evidence", disputeId: "demo-dispute-evidence-nike" },
    },
  });
  const evidenceAttachedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString();
  await prisma.dispute.upsert({
    where: { id: "demo-dispute-evidence-nike" },
    create: {
      id: "demo-dispute-evidence-nike",
      orderId: evidenceOrder.id,
      raisedById: buyer.id,
      reasonCode: "not_as_described",
      status: "awaiting_evidence",
      evidence: {
        version: evidenceRecordVersion,
        files: [
          {
            id: `${evidenceAsset.id}-seed`,
            assetId: evidenceAsset.id,
            url: evidenceAsset.publicUrl,
            category: "item_condition",
            contentType: "image/jpeg",
            byteSize: evidenceAsset.byteSize,
            checksumSha256: null,
            uploadedById: buyer.id,
            note: "Buyer photo shows sole wear after delivery.",
            redacted: false,
            attachedAt: evidenceAttachedAt,
          },
        ],
        countsByCategory: { item_condition: 1 },
        lastAttachedAt: evidenceAttachedAt,
        lastAttachedById: buyer.id,
      },
    },
    update: {
      orderId: evidenceOrder.id,
      raisedById: buyer.id,
      reasonCode: "not_as_described",
      status: "awaiting_evidence",
      evidence: {
        version: evidenceRecordVersion,
        files: [
          {
            id: `${evidenceAsset.id}-seed`,
            assetId: evidenceAsset.id,
            url: evidenceAsset.publicUrl,
            category: "item_condition",
            contentType: "image/jpeg",
            byteSize: evidenceAsset.byteSize,
            checksumSha256: null,
            uploadedById: buyer.id,
            note: "Buyer photo shows sole wear after delivery.",
            redacted: false,
            attachedAt: evidenceAttachedAt,
          },
        ],
        countsByCategory: { item_condition: 1 },
        lastAttachedAt: evidenceAttachedAt,
        lastAttachedById: buyer.id,
      },
    },
  });
  await prisma.notification.upsert({
    where: { id: "demo-notification-admin-evidence" },
    create: {
      id: "demo-notification-admin-evidence",
      userId: admin.id,
      type: "dispute",
      title: "Dispute evidence waiting",
      body: "A Nike order dispute has buyer evidence ready for support review.",
      actionUrl: "/evidence",
      metadata: { disputeId: "demo-dispute-evidence-nike", seeded: true },
    },
    update: {
      type: "dispute",
      title: "Dispute evidence waiting",
      body: "A Nike order dispute has buyer evidence ready for support review.",
      actionUrl: "/evidence",
      metadata: { disputeId: "demo-dispute-evidence-nike", seeded: true },
      readAt: null,
      archivedAt: null,
    },
  });

  const adidasListing = await prisma.listing.findUniqueOrThrow({
    where: { sellerId_slug: { sellerId: seller.id, slug: "adidas-spezial-track-jacket" } },
  });
  const logisticsQuote = calculateOrderQuote(adidasListing.priceNgn, 2_800);
  const logisticsPaidAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
  const logisticsShippedAt = new Date(Date.now() - 8 * 60 * 60 * 1000);
  const logisticsOrder = await prisma.order.upsert({
    where: { id: "demo-order-logistics-adidas" },
    create: {
      id: "demo-order-logistics-adidas",
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: adidasListing.id,
      grossNgn: logisticsQuote.grossNgn,
      buyerFeeNgn: logisticsQuote.buyerFeeNgn,
      sellerFeeNgn: logisticsQuote.sellerFeeNgn,
      authenticationFeeNgn: logisticsQuote.authenticationFeeNgn,
      paymentFeeNgn: logisticsQuote.paymentFeeNgn,
      shippingFeeNgn: logisticsQuote.shippingFeeNgn,
      payoutNgn: logisticsQuote.payoutNgn,
      status: "shipped",
      escrowState: "held",
      paidAt: logisticsPaidAt,
      shippedAt: logisticsShippedAt,
      autoConfirmAt: new Date(Date.now() + 64 * 60 * 60 * 1000),
      metadata: { seeded: true, buyerTotalNgn: logisticsQuote.buyerTotalNgn },
    },
    update: {
      buyerId: buyer.id,
      sellerId: seller.id,
      listingId: adidasListing.id,
      grossNgn: logisticsQuote.grossNgn,
      buyerFeeNgn: logisticsQuote.buyerFeeNgn,
      sellerFeeNgn: logisticsQuote.sellerFeeNgn,
      authenticationFeeNgn: logisticsQuote.authenticationFeeNgn,
      paymentFeeNgn: logisticsQuote.paymentFeeNgn,
      shippingFeeNgn: logisticsQuote.shippingFeeNgn,
      payoutNgn: logisticsQuote.payoutNgn,
      status: "shipped",
      escrowState: "held",
      paidAt: logisticsPaidAt,
      shippedAt: logisticsShippedAt,
      autoConfirmAt: new Date(Date.now() + 64 * 60 * 60 * 1000),
      metadata: { seeded: true, buyerTotalNgn: logisticsQuote.buyerTotalNgn },
    },
  });
  await prisma.listing.update({
    where: { id: adidasListing.id },
    data: { status: "reserved" },
  });
  await prisma.payment.upsert({
    where: { reference: "demo-payment-logistics-adidas" },
    create: {
      orderId: logisticsOrder.id,
      processor: "manual",
      reference: "demo-payment-logistics-adidas",
      amountNgn: logisticsQuote.buyerTotalNgn,
      status: "paid",
      channel: "transfer",
      paidAt: logisticsPaidAt,
      metadata: { seeded: true, source: "logistics_demo" },
    },
    update: {
      orderId: logisticsOrder.id,
      amountNgn: logisticsQuote.buyerTotalNgn,
      status: "paid",
      paidAt: logisticsPaidAt,
      metadata: { seeded: true, source: "logistics_demo" },
    },
  });
  await prisma.shipment.upsert({
    where: { id: "demo-shipment-logistics-adidas" },
    create: {
      id: "demo-shipment-logistics-adidas",
      orderId: logisticsOrder.id,
      shipperId: seller.id,
      recipientId: buyer.id,
      courier: "sendbox",
      trackingNumber: "SEN-BD-LOGISTICS-001",
      status: "in_transit",
      hubCode: "lekki-phase-1",
      insuredValueNgn: logisticsOrder.grossNgn,
      events: [
        {
          status: "in_transit",
          at: logisticsShippedAt.toISOString(),
          source: "seed",
          note: "Seller handoff completed at Lekki hub.",
          location: "Lekki hub",
        },
      ],
    },
    update: {
      orderId: logisticsOrder.id,
      shipperId: seller.id,
      recipientId: buyer.id,
      courier: "sendbox",
      trackingNumber: "SEN-BD-LOGISTICS-001",
      status: "in_transit",
      hubCode: "lekki-phase-1",
      insuredValueNgn: logisticsOrder.grossNgn,
      deliveredAt: null,
      events: [
        {
          status: "in_transit",
          at: logisticsShippedAt.toISOString(),
          source: "seed",
          note: "Seller handoff completed at Lekki hub.",
          location: "Lekki hub",
        },
      ],
    },
  });

  const mowalolaListing = await prisma.listing.findUniqueOrThrow({
    where: { sellerId_slug: { sellerId: seller.id, slug: "mowalola-vinyl-mini-bag" } },
  });
  const barterValuation = calculateBarterValuation(
    mowalolaListing.priceNgn,
    traderListing.priceNgn,
    seller.id,
    trader.id,
  );
  const logisticsBarter = await prisma.barterProposal.upsert({
    where: { id: "demo-barter-logistics-mowalola-orange-culture" },
    create: {
      id: "demo-barter-logistics-mowalola-orange-culture",
      initiatorId: trader.id,
      recipientId: seller.id,
      targetListingId: mowalolaListing.id,
      topUpNgn: barterValuation.topUpNgn,
      topUpPayerId: barterValuation.topUpPayerId,
      status: "accepted",
      valuationSnapshot: barterValuation,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
    update: {
      initiatorId: trader.id,
      recipientId: seller.id,
      targetListingId: mowalolaListing.id,
      topUpNgn: barterValuation.topUpNgn,
      topUpPayerId: barterValuation.topUpPayerId,
      status: "accepted",
      valuationSnapshot: barterValuation,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      acceptedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
  });
  await prisma.barterProposalListing.upsert({
    where: {
      proposalId_listingId: {
        proposalId: logisticsBarter.id,
        listingId: traderListing.id,
      },
    },
    create: {
      proposalId: logisticsBarter.id,
      listingId: traderListing.id,
      offeredById: trader.id,
    },
    update: {
      offeredById: trader.id,
    },
  });
  await prisma.listing.updateMany({
    where: { id: { in: [mowalolaListing.id, traderListing.id] } },
    data: { status: "barter_locked" },
  });
  await prisma.shipment.upsert({
    where: { id: "demo-shipment-logistics-barter-trader" },
    create: {
      id: "demo-shipment-logistics-barter-trader",
      barterProposalId: logisticsBarter.id,
      shipperId: trader.id,
      recipientId: seller.id,
      courier: "gig",
      trackingNumber: "GIG-BD-BARTER-001",
      status: "in_transit",
      hubCode: "wuse-2",
      insuredValueNgn: traderListing.priceNgn,
      events: [
        {
          status: "in_transit",
          at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          source: "seed",
          note: "Trader handoff completed for barter shipment.",
          location: "Abuja hub",
        },
      ],
    },
    update: {
      barterProposalId: logisticsBarter.id,
      shipperId: trader.id,
      recipientId: seller.id,
      courier: "gig",
      trackingNumber: "GIG-BD-BARTER-001",
      status: "in_transit",
      hubCode: "wuse-2",
      insuredValueNgn: traderListing.priceNgn,
      deliveredAt: null,
      events: [
        {
          status: "in_transit",
          at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          source: "seed",
          note: "Trader handoff completed for barter shipment.",
          location: "Abuja hub",
        },
      ],
    },
  });
  await prisma.notification.upsert({
    where: { id: "demo-notification-admin-logistics" },
    create: {
      id: "demo-notification-admin-logistics",
      userId: admin.id,
      type: "order",
      title: "Logistics queue active",
      body: "Seeded order and barter shipments are ready for carrier event review.",
      actionUrl: "/logistics",
      metadata: {
        orderId: logisticsOrder.id,
        barterProposalId: logisticsBarter.id,
        seeded: true,
      },
    },
    update: {
      type: "order",
      title: "Logistics queue active",
      body: "Seeded order and barter shipments are ready for carrier event review.",
      actionUrl: "/logistics",
      metadata: {
        orderId: logisticsOrder.id,
        barterProposalId: logisticsBarter.id,
        seeded: true,
      },
      readAt: null,
      archivedAt: null,
    },
  });
  await prisma.proSubscription.upsert({
    where: { id: "demo-pro-subscription-seller-tier-1" },
    create: {
      id: "demo-pro-subscription-seller-tier-1",
      sellerProfileId: sellerProfile.id,
      tier: "tier_1",
      status: "active",
      priceNgn: 20_000,
      metadata: { seeded: true, promotionCredits: 2, supportSlaHours: 24 },
    },
    update: {
      tier: "tier_1",
      status: "active",
      priceNgn: 20_000,
      metadata: { seeded: true, promotionCredits: 2, supportSlaHours: 24 },
    },
  });
  await prisma.sellerProfile.update({
    where: { id: sellerProfile.id },
    data: { proApprovedAt: new Date(), listingLimit: 25 },
  });
  await prisma.listingPromotion.upsert({
    where: { id: "demo-promotion-margiela-featured" },
    create: {
      id: "demo-promotion-margiela-featured",
      listingId: margielaListing.id,
      type: "featured",
      status: "active",
      priceNgn: 8_000,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metadata: { seeded: true, source: "prisma.seed" },
    },
    update: {
      type: "featured",
      status: "active",
      priceNgn: 8_000,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      metadata: { seeded: true, source: "prisma.seed" },
    },
  });

  const supportThread = await prisma.messageThread.upsert({
    where: { id: "demo-thread-support-buyer-admin" },
    create: {
      id: "demo-thread-support-buyer-admin",
      metadata: {
        source: "support",
        topic: "Authentication status check",
        createdById: buyer.id,
      },
    },
    update: {
      status: "open",
      metadata: {
        source: "support",
        topic: "Authentication status check",
        createdById: buyer.id,
      },
    },
  });

  await prisma.messageThreadParticipant.upsert({
    where: { threadId_userId: { threadId: supportThread.id, userId: buyer.id } },
    create: { threadId: supportThread.id, userId: buyer.id, role: "buyer" },
    update: { role: "buyer" },
  });
  await prisma.messageThreadParticipant.upsert({
    where: { threadId_userId: { threadId: supportThread.id, userId: admin.id } },
    create: { threadId: supportThread.id, userId: admin.id, role: "support" },
    update: { role: "support" },
  });

  const supportBody = sanitizeUserText(
    "Can BD Select confirm if direct WhatsApp contact like 08012345678 is blocked here?",
  );
  await prisma.message.upsert({
    where: { id: "demo-message-support-buyer" },
    create: {
      id: "demo-message-support-buyer",
      threadId: supportThread.id,
      senderId: buyer.id,
      body: supportBody,
      redactedBody: redactMarketplacePii(supportBody),
      redactions: hasMarketplacePii(supportBody) ? { marketplacePii: true } : undefined,
    },
    update: {
      body: supportBody,
      redactedBody: redactMarketplacePii(supportBody),
      redactions: hasMarketplacePii(supportBody) ? { marketplacePii: true } : undefined,
    },
  });

  await prisma.notification.upsert({
    where: { id: "demo-notification-buyer-support" },
    create: {
      id: "demo-notification-buyer-support",
      userId: buyer.id,
      type: "system",
      title: "Support conversation is open",
      body: "BD Select support has a protected thread ready in your inbox.",
      actionUrl: "/inbox",
      metadata: { threadId: supportThread.id, seeded: true },
    },
    update: {
      type: "system",
      title: "Support conversation is open",
      body: "BD Select support has a protected thread ready in your inbox.",
      actionUrl: "/inbox",
      metadata: { threadId: supportThread.id, seeded: true },
      readAt: null,
      archivedAt: null,
    },
  });

  await prisma.notification.upsert({
    where: { id: "demo-notification-seller-listing" },
    create: {
      id: "demo-notification-seller-listing",
      userId: seller.id,
      type: "listing",
      title: "Listing is live",
      body: "Your Maison Margiela jacket is visible in the BD Select marketplace.",
      actionUrl: "/marketplace",
      metadata: { seeded: true },
      readAt: new Date(),
    },
    update: {
      type: "listing",
      title: "Listing is live",
      body: "Your Maison Margiela jacket is visible in the BD Select marketplace.",
      actionUrl: "/marketplace",
      metadata: { seeded: true },
      readAt: new Date(),
      archivedAt: null,
    },
  });

  await prisma.notification.upsert({
    where: { id: "demo-notification-trader-barter" },
    create: {
      id: "demo-notification-trader-barter",
      userId: trader.id,
      type: "barter",
      title: "Swap rack ready",
      body: "Your Orange Culture bomber can now receive authenticated barter proposals.",
      actionUrl: "/barter",
      metadata: { listingId: traderListing.id, seeded: true },
    },
    update: {
      type: "barter",
      title: "Swap rack ready",
      body: "Your Orange Culture bomber can now receive authenticated barter proposals.",
      actionUrl: "/barter",
      metadata: { listingId: traderListing.id, seeded: true },
      readAt: null,
      archivedAt: null,
    },
  });

  await prisma.notification.upsert({
    where: { id: "demo-notification-admin-trust" },
    create: {
      id: "demo-notification-admin-trust",
      userId: admin.id,
      type: "authentication",
      title: "Review SLA approaching",
      body: "A restricted-brand listing is waiting in the authentication queue.",
      actionUrl: "/admin",
      metadata: { seeded: true },
    },
    update: {
      type: "authentication",
      title: "Review SLA approaching",
      body: "A restricted-brand listing is waiting in the authentication queue.",
      actionUrl: "/admin",
      metadata: { seeded: true },
      readAt: null,
      archivedAt: null,
    },
  });

  const signedAuditCreatedAt = new Date();
  const signedAuditPayload = {
    id: "demo-audit-listing-approved",
    actorId: admin.id,
    action: "listing.approved",
    entity: "Listing",
    entityId: margielaListing.id,
    beforeState: { status: "in_review" },
    afterState: { status: "live", seeded: true },
    ipAddress: null,
    userAgent: null,
    requestId: "seed-demo-audit",
    metadata: { source: "prisma.seed" },
    createdAt: signedAuditCreatedAt,
  };
  await prisma.auditLog.upsert({
    where: { id: signedAuditPayload.id },
    create: {
      ...signedAuditPayload,
      signature: signAuditLog(signedAuditPayload),
      signatureVersion: auditSignatureVersion,
    },
    update: {
      actorId: signedAuditPayload.actorId,
      action: signedAuditPayload.action,
      entity: signedAuditPayload.entity,
      entityId: signedAuditPayload.entityId,
      beforeState: signedAuditPayload.beforeState,
      afterState: signedAuditPayload.afterState,
      requestId: signedAuditPayload.requestId,
      metadata: signedAuditPayload.metadata,
      createdAt: signedAuditPayload.createdAt,
      signature: signAuditLog(signedAuditPayload),
      signatureVersion: auditSignatureVersion,
    },
  });

  await prisma.auditLog.upsert({
    where: { id: "demo-audit-support-thread" },
    create: {
      id: "demo-audit-support-thread",
      actorId: buyer.id,
      action: "message.thread_created",
      entity: "MessageThread",
      entityId: supportThread.id,
      afterState: { source: "support", participantCount: 2, seeded: true },
      requestId: "seed-demo-audit",
      metadata: { source: "prisma.seed" },
    },
    update: {
      actorId: buyer.id,
      action: "message.thread_created",
      entity: "MessageThread",
      entityId: supportThread.id,
      afterState: { source: "support", participantCount: 2, seeded: true },
      requestId: "seed-demo-audit",
      metadata: { source: "prisma.seed" },
      signature: null,
      signatureVersion: null,
    },
  });

  console.log("Seeded BD Select demo personas and listings.");
}

async function main() {
  await seedTaxonomy();

  if (process.env.SEED_DEMO_DATA === "true") {
    await seedDemoData();
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log("Seeded BD Select categories and initial brands. Admin seed skipped.");
    return;
  }

  if (adminPassword.length < 16) {
    throw new Error("ADMIN_PASSWORD must be at least 16 characters.");
  }

  const adminName = process.env.ADMIN_NAME || "BD Select Admin";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      name: adminName,
      passwordHash,
      emailVerified: new Date(),
      role: "super_admin",
      kycStatus: "verified",
    },
    update: {
      name: adminName,
      passwordHash,
      emailVerified: new Date(),
      role: "super_admin",
      kycStatus: "verified",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "bootstrap.admin_seeded",
      entity: "User",
      entityId: user.id,
      metadata: { source: "prisma.seed", product: "bd-select" },
    },
  });

  console.log(`Seeded BD Select admin ${adminEmail}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
