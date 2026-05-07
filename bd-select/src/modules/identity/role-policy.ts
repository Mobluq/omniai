export type UserRole = "buyer" | "seller" | "authenticator" | "admin" | "super_admin";
export type KycStatus = "not_started" | "pending" | "verified" | "rejected" | "expired";

const roleRank: Record<UserRole, number> = {
  buyer: 1,
  seller: 2,
  authenticator: 3,
  admin: 4,
  super_admin: 5,
};

export function hasUserRole(role: UserRole, minimumRole: UserRole) {
  return roleRank[role] >= roleRank[minimumRole];
}

export function canListItems(role: UserRole, kycStatus: KycStatus) {
  return hasUserRole(role, "seller") && kycStatus === "verified";
}

export function canReviewListings(role: UserRole) {
  return hasUserRole(role, "authenticator");
}

export function canManageMarketplace(role: UserRole) {
  return hasUserRole(role, "admin");
}

export function canManageSecurity(role: UserRole) {
  return role === "super_admin";
}
