export class CONSTANTS {
  static readonly AUTH_PROFILE = 'AUTH.PROFILE';
  static readonly AUTH_LOGOUT = 'AUTH.LOGOUT';
  static readonly AUTH_LOGIN = 'AUTH.LOGIN';
  static readonly AUTH_REGISTER = 'AUTH.REGISTER';
  static readonly AUTH_EMAIL = 'AUTH.EMAIL';
  static readonly AUTH_PASSWORD = 'AUTH.PASSWORD';
  static readonly AUTH_CONFIRM_PASSWORD = 'AUTH.CONFIRM_PASSWORD';
  static readonly AUTH_LOGIN_IN_PROFILE = 'AUTH.LOGIN_IN_PROFILE';
  static readonly AUTH_ALREADY_REGISTERED = 'AUTH.ALREADY_REGISTERED';
  static readonly AUTH_PASSWORDS_NOT_MATCH = 'AUTH.PASSWORDS_NOT_MATCH';
  static readonly AUTH_REGISTER_FAILED = 'AUTH.REGISTER_FAILED';
  static readonly AUTH_LOGIN_FAILED = 'AUTH.LOGIN_FAILED';
  static readonly AUTH_NO_ACCOUNT = 'AUTH.NO_ACCOUNT';
  static readonly AUTH_REGISTER_NOW = 'AUTH.REGISTER_NOW';
  static readonly AUTH_GOOGLE_LOGIN = 'AUTH.GOOGLE_LOGIN';
  static readonly AUTH_SETTINGS: 'AUTH_SETTINGS';
  static readonly AUTH_ACCOUNT_SETTINGS = 'AUTH.ACCOUNT_SETTINGS';
  static readonly AUTH_SUBSCRIPTION_SETTINGS = 'AUTH.SUBSCRIPTION_SETTINGS';
  static readonly AUTH_PRIVACY_SETTINGS = 'AUTH.PRIVACY_SETTINGS';
  static readonly AUTH_LOGIN_ERROR = 'AUTH.LOGIN_ERROR';

  static readonly ROUTES = {
    HOME: '',
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    TREE: '/tree',
    AUTH_GOOGLE_LOGIN: '/auth/google',
    SETTINGS: {
      ACCOUNT: '/settings/account',
      SUBSCRIPTION: '/settings/subscription',
      PRIVACY: '/settings/privacy',
    },
    ONBOARDING: {
      OWNER: '/onboarding/owner',
      MOTHER: '/onboarding/mother',
      MATERNAL_GRANDPARENTS: '/onboarding/maternal-grandparents',
      FATHER: '/onboarding/father',
      PATERNAL_GRANDPARENTS: '/onboarding/paternal-grandparents',
    },
  };

  static readonly INFO_OWNER = 'INFO.OWNER';
  static readonly INFO_MOTHER = 'INFO.MOTHER';
  static readonly INFO_FATHER = 'INFO.FATHER';
  static readonly INFO_MOTHER_PARENTS = 'INFO.MOTHER_PARENTS';
  static readonly INFO_FATHER_PARENTS = 'INFO.FATHER_PARENTS';
  static readonly INFO_FIRST_NAME = 'INFO.FIRST_NAME';
  static readonly INFO_MIDDLE_NAME = 'INFO.MIDDLE_NAME';
  static readonly INFO_LAST_NAME = 'INFO.LAST_NAME';
  static readonly INFO_DATE_OF_BIRTH = 'INFO.DATE_OF_BIRTH';
  static readonly INFO_DATE_OF_DEATH = 'INFO.DATE_OF_DEATH';
  static readonly INFO_PHOTO_LABEL = 'INFO.PHOTO_LABEL';
  static readonly INFO_GENDER = 'INFO.GENDER';
  static readonly INFO_FORWARD = 'INFO.FORWARD';
  static readonly INFO_BACK = 'INFO.BACK';
  static readonly INFO_IS_ALIVE = 'INFO.IS_ALIVE';
  static readonly INFO_MATERNAL_GRANDPARENTS = 'INFO.MATERNAL_GRANDPARENTS';
  static readonly INFO_PATERNAL_GRANDPARENTS = 'INFO.PATERNAL_GRANDPARENTS';
  static readonly INFO_MATERNAL_GRANDMOTHER = 'INFO.MATERNAL_GRANDMOTHER';
  static readonly INFO_MATERNAL_GRANDFATHER = 'INFO.MATERNAL_GRANDFATHER';
  static readonly INFO_SAVE = 'INFO.SAVE';
  static readonly INFO_CANCEL = 'INFO.CANCEL';

  static readonly ADD_PHOTO = 'ADD.PHOTO';

  static readonly GENDER_MALE = 'GENDER.MALE';
  static readonly GENDER_FEMALE = 'GENDER.FEMALE';
  static readonly GENDER_OTHER = 'GENDER.OTHER';

  static readonly RELATION_BROTHER = 'RELATION.BROTHER';
  static readonly RELATION_SISTER = 'RELATION.SISTER';
  static readonly RELATION_PARTNER = 'RELATION.PARTNER';
  static readonly RELATION_SON = 'RELATION.SON';
  static readonly RELATION_DAUGHTER = 'RELATION.DAUGHTER';
  static readonly RELATION_ADD_RELATIVE_HEADER = 'RELATION.ADD_RELATIVE_HEADER';
  static readonly RELATION_CHOOSE_RELATION = 'RELATION.CHOOSE_RELATION';
}
