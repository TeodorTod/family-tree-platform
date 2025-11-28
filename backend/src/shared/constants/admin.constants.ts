const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

const decode = (value: string) => {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
};

const FALLBACK_B64 = 'YWRtaW5fdG9kQHJvZG9zdG9yaWEuY29t';

export const getAdminEmail = () => {
  const configured = normalize(process.env.ADMIN_EMAIL);
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  return normalize(decode(FALLBACK_B64));
};

export const isAdminEmail = (email?: string | null) => {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    return false;
  }
  return normalize(email) === adminEmail;
};
