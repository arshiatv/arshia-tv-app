import { fbGet, fbSet, fbUpdate, fbRemove } from './firebase';

export type ReportTargetType = 'user' | 'movie' | 'channel' | 'upload';

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reporterName?: string;
  reason: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  adminNote?: string;
}

export interface BanRecord {
  userId: string;
  banCount: number;
  banUntil: number | null;
  status: 'active' | 'banned' | 'restricted';
  lastReason?: string;
  updatedAt: number;
}

const BAN_THRESHOLDS = {
  warningsForAction: 10,
  firstBanDays: 7,
  secondBanDays: 30,
  thirdBanPermanent: true,
};

export async function submitReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reporterName?: string;
  reason: string;
}): Promise<{ ok: boolean; id?: string; message?: string }> {
  if (!input.reporterId || !input.targetId || !input.reason.trim()) {
    return { ok: false, message: 'اطلاعات ناقص است' };
  }
  const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const report: Report = {
    id,
    targetType: input.targetType,
    targetId: input.targetId,
    targetTitle: input.targetTitle || '',
    reporterId: input.reporterId,
    reporterName: input.reporterName || '',
    reason: input.reason.trim(),
    createdAt: Date.now(),
    status: 'pending',
  };
  try {
    await fbSet(`reports/${id}`, report);
    await fbSet(`reportsByTarget/${input.targetType}/${input.targetId}/${id}`, true);
    return { ok: true, id };
  } catch {
    return { ok: false, message: 'ثبت گزارش انجام نشد' };
  }
}

export async function listPendingReports(limit = 100): Promise<Report[]> {
  try {
    const data = await fbGet('reports');
    if (!data) return [];
    return Object.values(data as Record<string, Report>)
      .filter((r) => r && r.status === 'pending')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function countReportsForTarget(
  targetType: ReportTargetType,
  targetId: string
): Promise<number> {
  try {
    const data = await fbGet(`reportsByTarget/${targetType}/${targetId}`);
    if (!data) return 0;
    return Object.keys(data).length;
  } catch {
    return 0;
  }
}

export async function setReportStatus(
  id: string,
  status: Report['status'],
  adminNote?: string
): Promise<boolean> {
  try {
    await fbUpdate(`reports/${id}`, {
      status,
      adminNote: adminNote || null,
      reviewedAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function applyWarningOrBan(
  userId: string,
  reason: string
): Promise<{ ok: boolean; action: 'warning' | 'ban' | 'permanent'; days?: number; message?: string }> {
  try {
    const profile = await fbGet(`users/${userId}`);
    if (!profile) return { ok: false, action: 'warning', message: 'کاربر یافت نشد' };

    const warnings = (profile.warnings || 0) + 1;
    let banCount = profile.banCount || 0;
    let banUntil: number | null = profile.banUntil || null;
    let status = profile.status || 'active';
    let action: 'warning' | 'ban' | 'permanent' = 'warning';
    let days = 0;

    if (warnings >= BAN_THRESHOLDS.warningsForAction) {
      banCount += 1;
      if (banCount === 1) {
        days = BAN_THRESHOLDS.firstBanDays;
        banUntil = Date.now() + days * 24 * 60 * 60 * 1000;
        status = 'banned';
        action = 'ban';
      } else if (banCount === 2) {
        days = BAN_THRESHOLDS.secondBanDays;
        banUntil = Date.now() + days * 24 * 60 * 60 * 1000;
        status = 'banned';
        action = 'ban';
      } else {
        banUntil = -1;
        status = 'banned';
        action = 'permanent';
      }
    }

    await fbUpdate(`users/${userId}`, {
      warnings,
      banCount,
      banUntil,
      status,
      lastBanReason: reason,
      updatedAt: Date.now(),
    });

    await fbSet(`bans/${userId}/${Date.now()}`, {
      warnings,
      banCount,
      banUntil,
      status,
      reason,
      at: Date.now(),
    });

    return {
      ok: true,
      action,
      days: action === 'ban' ? days : undefined,
      message:
        action === 'warning'
          ? `اخطار ثبت شد (${warnings}/${BAN_THRESHOLDS.warningsForAction})`
          : action === 'permanent'
          ? 'مسدود دائمی'
          : `مسدود به مدت ${days} روز`,
    };
  } catch {
    return { ok: false, action: 'warning', message: 'خطا در اعمال محدودیت' };
  }
}

export async function unbanUser(userId: string): Promise<boolean> {
  try {
    await fbUpdate(`users/${userId}`, {
      status: 'active',
      banUntil: null,
      updatedAt: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

export { BAN_THRESHOLDS };
