export type PartnerStatus =
  | 'MARRIED' | 'DIVORCED' | 'SEPARATED' | 'WIDOWED' | 'ENGAGED'
  | 'PARTNERS' | 'FRIENDS' | 'ANNULLED' | 'UNKNOWN' | 'OTHER';

export const partnerStatusKey = (s?: PartnerStatus | null) =>
  s ? `PARTNER_STATUS.${s}` : 'PARTNER_STATUS.UNKNOWN';
