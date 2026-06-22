export type TravelEntry = {
  id: string;
  date: string;
  financialYear: string;
  startLocation: string;
  endLocation: string;
  kilometres: number;
  calculatedKilometres: number | null;
  distanceSource: "calculated" | "manual";
  notes: string | null;
  vehicle: string | null;
  odometerStart: number | null;
  odometerEnd: number | null;
  roundTrip: boolean;
  tripCategory: "work" | "personal" | "commute" | "client_visit" | "site_visit" | "training" | "supplier_visit";
  commuteReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRole = "user" | "super_admin";

export type User = {
  id: string;
  fullName: string;
  address: string;
  email: string;
  tfn: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  expiresAt: string;
};

export type DashboardData = {
  financialYearLabel: string;
  totals: {
    financialYear: number;
    month: number;
    week: number;
    trips: number;
  };
  recent: TravelEntry[];
  chart: { period: string; kilometres: number }[];
  financialYears: { financialYear: string; kilometres: number; trips: number }[];
};

export type EntryPayload = Omit<
  TravelEntry,
  "id" | "financialYear" | "createdAt" | "updatedAt"
>;

export type FrequentDestination = {
  id: string;
  userId: string;
  nickname: string;
  address: string;
  category: "home" | "office" | "client" | "supplier" | "training" | "job_site" | "other";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DestinationPayload = Pick<FrequentDestination, "nickname" | "address" | "category" | "notes">;

export type DeductionSummary = {
  financialYear: string;
  totalWorkKilometres: number;
  eligibleKilometres: number;
  vehicleBreakdown: { vehicle: string; kilometres: number; eligibleKilometres: number }[];
  centsPerKilometreRate: number;
  estimatedDeduction: number;
  marginalTaxRate: number;
  estimatedTaxBenefit: number;
  financialYearProgress: number;
  disclaimer: string;
};
