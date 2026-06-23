import { Router } from "express";
import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  availableFinancialYears,
  chartSeries,
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  totalKilometres,
  updateEntry,
} from "./repository.js";
import { currentSummaryRanges, financialYearRange } from "./dateUtils.js";
import {
  deductionQuerySchema,
  destinationSchema,
  entryPayloadSchema,
  rangeQuerySchema,
  reportQuerySchema,
  taxSettingsSchema,
  vehicleSchema,
} from "./validation.js";
import { buildAuditPdf, buildCsv, buildPdf, buildXlsx } from "./reports.js";
import {
  createDestination,
  createVehicle,
  deductionSummary,
  deleteDestination,
  deleteVehicle,
  getCentsPerKilometreRate,
  isLikelyCommute,
  listDestinations,
  listVehicles,
  setCentsPerKilometreRate,
  updateDestination,
  updateVehicle,
} from "./stageOne.js";
import {
  adminOnly,
  adminUpdateUserSchema,
  authMiddleware,
  AuthenticatedRequest,
  changePasswordSchema,
  clearSessionCookie,
  createSession,
  createUser,
  deleteSession,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsers,
  loginSchema,
  profileSchema,
  sessionTokenFromRequest,
  setSessionCookie,
  signupSchema,
  toPublicUser,
  updatePassword,
  updateUserProfile,
  verifyPassword,
} from "./auth.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "FridayRun API" });
});

router.post("/auth/signup", (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);
    const user = createUser(payload);
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.status(201).json({ user, expiresAt: session.expiresAt });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = findUserByEmail(payload.email);
    if (!user || !verifyPassword(payload.password, user.password_hash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json({ user: toPublicUser(user), expiresAt: session.expiresAt });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/auth/logout",
  authMiddleware,
  (req: AuthenticatedRequest, res) => {
    const token = sessionTokenFromRequest(req);
    if (token) deleteSession(token);
    clearSessionCookie(res);
    res.status(204).send();
  },
);

router.get("/me", authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json(req.user);
});

router.put("/me", authMiddleware, (req: AuthenticatedRequest, res, next) => {
  try {
    const payload = profileSchema.parse(req.body);
    const user = updateUserProfile(req.user!.id, payload);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.put(
  "/me/password",
  authMiddleware,
  (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = changePasswordSchema.parse(req.body);
      const user = findUserById(req.user!.id);
      if (
        !user ||
        !verifyPassword(payload.currentPassword, user.password_hash)
      ) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      updatePassword(req.user!.id, payload.newPassword);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

router.get("/admin/users", authMiddleware, adminOnly, (_req, res) => {
  res.json(listUsers());
});

router.put("/admin/users/:id", authMiddleware, adminOnly, (req, res, next) => {
  try {
    const payload = adminUpdateUserSchema.parse(req.body);
    const userId = String(req.params.id);
    const user = updateUserProfile(userId, payload);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete("/admin/users/:id", authMiddleware, adminOnly, (req, res) => {
  const userId = String(req.params.id);
  if (userId === (req as AuthenticatedRequest).user!.id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }
  if (!deleteUser(userId)) {
    res.status(404).json({ error: "User not found or cannot be deleted" });
    return;
  }
  res.status(204).send();
});

router.get("/admin/settings/tax", authMiddleware, adminOnly, (_req, res) => {
  res.json({ centsPerKilometreRate: getCentsPerKilometreRate() });
});

router.put(
  "/admin/settings/tax",
  authMiddleware,
  adminOnly,
  (req, res, next) => {
    try {
      const payload = taxSettingsSchema.parse(req.body);
      res.json({
        centsPerKilometreRate: setCentsPerKilometreRate(
          payload.centsPerKilometreRate,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.use(authMiddleware);

router.get("/entries", (req, res, next) => {
  try {
    const filters = rangeQuerySchema.parse(req.query);
    res.json(
      listEntries({
        ...filters,
        userId: (req as AuthenticatedRequest).user!.id,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/entries", (req, res, next) => {
  try {
    const payload = entryPayloadSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    if (
      payload.tripCategory === "work" &&
      isLikelyCommute(userId, payload.startLocation, payload.endLocation) &&
      !payload.commuteReason
    ) {
      res
        .status(400)
        .json({
          error:
            "Normal home-to-work commuting may not be deductible. Add a reason before recording this as work travel.",
          code: "COMMUTE_REASON_REQUIRED",
        });
      return;
    }
    res.status(201).json(createEntry(userId, payload));
  } catch (error) {
    next(error);
  }
});

router.get("/entries/:id", (req, res) => {
  const entry = getEntry(req.params.id, (req as AuthenticatedRequest).user!.id);
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.json(entry);
});

router.put("/entries/:id", (req, res, next) => {
  try {
    const payload = entryPayloadSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).user!.id;
    if (
      payload.tripCategory === "work" &&
      isLikelyCommute(userId, payload.startLocation, payload.endLocation) &&
      !payload.commuteReason
    ) {
      res
        .status(400)
        .json({
          error:
            "Normal home-to-work commuting may not be deductible. Add a reason before recording this as work travel.",
          code: "COMMUTE_REASON_REQUIRED",
        });
      return;
    }
    const entry = updateEntry(req.params.id, userId, payload);
    if (!entry) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }
    res.json(entry);
  } catch (error) {
    next(error);
  }
});

router.delete("/entries/:id", (req, res) => {
  if (!deleteEntry(req.params.id, (req as AuthenticatedRequest).user!.id)) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  res.status(204).send();
});

router.get("/dashboard", (_req, res) => {
  const userId = (_req as AuthenticatedRequest).user!.id;
  const ranges = currentSummaryRanges();
  const financialYear = totalKilometres({ ...ranges.financialYear, userId });
  const month = totalKilometres({ ...ranges.month, userId });
  const week = totalKilometres({ ...ranges.week, userId });
  const recent = listEntries({ limit: 6, userId }).entries;
  res.json({
    financialYearLabel: ranges.financialYearLabel,
    totals: {
      financialYear: financialYear.kilometres,
      month: month.kilometres,
      week: week.kilometres,
      trips: totalKilometres({ userId }).trips,
    },
    recent,
    chart: chartSeries({ ...ranges.financialYear, userId }),
    financialYears: availableFinancialYears(userId),
  });
});

router.get("/financial-years", (req, res) => {
  res.json(availableFinancialYears((req as AuthenticatedRequest).user!.id));
});

router.get("/destinations", (req, res) =>
  res.json(listDestinations((req as AuthenticatedRequest).user!.id)),
);
router.post("/destinations", (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        createDestination(
          (req as AuthenticatedRequest).user!.id,
          destinationSchema.parse(req.body),
        ),
      );
  } catch (error) {
    next(error);
  }
});
router.put("/destinations/:id", (req, res, next) => {
  try {
    const result = updateDestination(
      req.params.id,
      (req as AuthenticatedRequest).user!.id,
      destinationSchema.parse(req.body),
    );
    if (!result) {
      res.status(404).json({ error: "Destination not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});
router.delete("/destinations/:id", (req, res) => {
  if (
    !deleteDestination(req.params.id, (req as AuthenticatedRequest).user!.id)
  ) {
    res.status(404).json({ error: "Destination not found" });
    return;
  }
  res.status(204).send();
});

router.get("/vehicles", (req, res) =>
  res.json(listVehicles((req as AuthenticatedRequest).user!.id)),
);
router.post("/vehicles", (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        createVehicle(
          (req as AuthenticatedRequest).user!.id,
          vehicleSchema.parse(req.body),
        ),
      );
  } catch (error) {
    next(error);
  }
});
router.put("/vehicles/:id", (req, res, next) => {
  try {
    const result = updateVehicle(
      req.params.id,
      (req as AuthenticatedRequest).user!.id,
      vehicleSchema.parse(req.body),
    );
    if (!result) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});
router.delete("/vehicles/:id", (req, res) => {
  if (!deleteVehicle(req.params.id, (req as AuthenticatedRequest).user!.id)) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.status(204).send();
});

router.get("/deductions", (req, res, next) => {
  try {
    const query = deductionQuerySchema.parse(req.query);
    res.json(
      deductionSummary(
        (req as AuthenticatedRequest).user!.id,
        query.financialYear,
        query.marginalTaxRate,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/reports/audit-package", async (req, res, next) => {
  try {
    const query = deductionQuerySchema.parse(req.query);
    const user = (req as AuthenticatedRequest).user!;
    const summary = deductionSummary(
      user.id,
      query.financialYear,
      query.marginalTaxRate,
    );
    const range = financialYearRange(summary.financialYear);
    const { entries } = listEntries({ ...range, limit: 500, userId: user.id });
    const buffer = await buildAuditPdf({
      entries,
      totalKilometres: summary.totalWorkKilometres,
      title: "FridayRun ATO Audit Package",
      ...range,
      user,
      deduction: summary,
      exportedAt: new Date().toISOString(),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fridayrun-audit-package-${summary.financialYear}.pdf"`,
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const query = reportQuerySchema.parse(req.query);
    let startDate = query.startDate;
    let endDate = query.endDate;

    if (query.financialYear || query.period === "financial-year") {
      const range = financialYearRange(
        query.financialYear ?? currentSummaryRanges().financialYearLabel,
      );
      startDate = range.startDate;
      endDate = range.endDate;
    } else if (query.period === "week") {
      const date = startDate ? parseISO(startDate) : new Date();
      startDate = format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      endDate = format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    } else if (query.period === "month") {
      const date = startDate ? parseISO(startDate) : new Date();
      startDate = format(startOfMonth(date), "yyyy-MM-dd");
      endDate = format(endOfMonth(date), "yyyy-MM-dd");
    }

    if (!startDate || !endDate) {
      res
        .status(400)
        .json({
          error: "startDate and endDate are required for custom reports",
        });
      return;
    }

    const user = (req as AuthenticatedRequest).user!;
    const { entries } = listEntries({
      startDate,
      endDate,
      limit: 500,
      userId: user.id,
    });
    const total = entries.reduce((sum, entry) => sum + entry.kilometres, 0);
    const title = `FridayRun Travel Report`;
    const payload = {
      entries,
      totalKilometres: total,
      title,
      startDate,
      endDate,
      user,
    };
    const builders = {
      csv: buildCsv,
      xlsx: buildXlsx,
      pdf: buildPdf,
    };
    const contentTypes = {
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf",
    };
    const buffer = await builders[query.format](payload);
    res.setHeader("Content-Type", contentTypes[query.format]);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fridayrun-${startDate}-to-${endDate}.${query.format}"`,
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});
