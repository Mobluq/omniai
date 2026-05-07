import { ListingDetailClient } from "@/app/marketplace/[listingId]/listing-detail-client";

type ListingDetailPageProps = {
  params: Promise<{ listingId: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listingId } = await params;
  return <ListingDetailClient listingId={listingId} />;
}
