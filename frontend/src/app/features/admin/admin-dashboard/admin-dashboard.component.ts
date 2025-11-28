import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SHARED_ANGULAR_IMPORTS } from '../../../shared/imports/shared-angular-imports';
import { SHARED_PRIMENG_IMPORTS } from '../../../shared/imports/shared-primeng-imports';
import { CONSTANTS } from '../../../shared/constants/constants';
import { AdminService } from '../services/admin.service';
import {
  AdminMemberDetail,
  AdminUserSummary,
} from '../models/admin.models';
import { SubscriptionPlanCode } from '../../../shared/types/subscription-plan.type';

type SortDirection = 'asc' | 'desc';
type UserSortField =
  | 'user'
  | 'language'
  | 'memberCount'
  | 'profileCount'
  | 'dataRecords'
  | 'lastMemberChangeAt'
  | 'subscriptionPlan';
type MemberSortField =
  | 'name'
  | 'role'
  | 'relation'
  | 'status'
  | 'lastChange'
  | 'dataUsage';

interface SortState<F> {
  field: F;
  direction: SortDirection;
}

interface UserFilters {
  user: string;
  language: string;
  members: string;
  profiles: string;
  dataUsage: string;
  lastChange: string;
  plan: string;
}

interface MemberFilters {
  name: string;
  role: string;
  relation: string;
  status: string;
  lastChange: string;
  dataUsage: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [...SHARED_ANGULAR_IMPORTS, ...SHARED_PRIMENG_IMPORTS],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  protected readonly CONSTANTS = CONSTANTS;

  private readonly adminService = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly loadingUsers = signal(true);
  readonly loadingMembers = signal(false);
  readonly users = signal<AdminUserSummary[]>([]);
  readonly members = signal<AdminMemberDetail[]>([]);
  readonly usersError = signal<string | null>(null);
  readonly membersError = signal<string | null>(null);
  readonly selectedUserId = signal<string | null>(null);

  private readonly defaultUserFilters: UserFilters = {
    user: '',
    language: '',
    members: '',
    profiles: '',
    dataUsage: '',
    lastChange: '',
    plan: '',
  };

  private readonly defaultMemberFilters: MemberFilters = {
    name: '',
    role: '',
    relation: '',
    status: '',
    lastChange: '',
    dataUsage: '',
  };

  readonly userFilters = signal<UserFilters>({ ...this.defaultUserFilters });
  readonly memberFilters = signal<MemberFilters>({
    ...this.defaultMemberFilters,
  });
  readonly userSort = signal<SortState<UserSortField> | null>(null);
  readonly memberSort = signal<SortState<MemberSortField> | null>(null);
  readonly userPage = signal(1);
  readonly membersPage = signal(1);
  readonly userPageSize = signal(10);
  readonly membersPageSize = signal(10);

  readonly processedUsers = computed(() => {
    const filters = this.userFilters();
    const sort = this.userSort();
    const rows = this.users().filter((user) => this.matchesUserFilters(user, filters));
    if (!sort) {
      return rows;
    }
    const sorted = [...rows].sort((a, b) =>
      this.compareUsers(a, b, sort.field, sort.direction),
    );
    return sorted;
  });

  readonly pagedUsers = computed(() => {
    const page = this.userPage();
    const size = this.userPageSize();
    const rows = this.processedUsers();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly userTotalPages = computed(() => {
    const total = this.processedUsers().length;
    return Math.max(1, Math.ceil(total / this.userPageSize()));
  });

  readonly processedMembers = computed(() => {
    const filters = this.memberFilters();
    const sort = this.memberSort();
    const rows = this.members().filter((member) =>
      this.matchesMemberFilters(member, filters),
    );
    if (!sort) {
      return rows;
    }
    const sorted = [...rows].sort((a, b) =>
      this.compareMembers(a, b, sort.field, sort.direction),
    );
    return sorted;
  });

  readonly pagedMembers = computed(() => {
    const page = this.membersPage();
    const size = this.membersPageSize();
    const rows = this.processedMembers();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  readonly memberTotalPages = computed(() => {
    const total = this.processedMembers().length;
    return Math.max(1, Math.ceil(total / this.membersPageSize()));
  });

  private readonly planKeyMap: Record<SubscriptionPlanCode, string> = {
    SIX_MONTHS: CONSTANTS.SETTINGS_PLAN_6M,
    ONE_YEAR: CONSTANTS.SETTINGS_PLAN_1Y,
    TWO_YEARS: CONSTANTS.SETTINGS_PLAN_2Y,
  };

  readonly selectedUser = computed(() => {
    const selectedId = this.selectedUserId();
    if (!selectedId) {
      return null;
    }
    return this.users().find((user) => user.id === selectedId) ?? null;
  });

  readonly totalUsers = computed(() => this.users().length);

  readonly totalMembers = computed(() =>
    this.users().reduce((sum, user) => sum + user.memberCount, 0),
  );

  readonly totalDataRecords = computed(() =>
    this.users().reduce((sum, user) => sum + user.dataRecords, 0),
  );

  readonly selectedMembersCount = computed(() => this.members().length);
  readonly selectedMembersDataUsage = computed(() =>
    this.members().reduce((sum, member) => sum + member.dataUsage, 0),
  );

  constructor() {
    effect(() => {
      const total = this.userTotalPages();
      const current = this.userPage();
      if (current > total) {
        this.userPage.set(total);
      }
    });

    effect(() => {
      const total = this.memberTotalPages();
      const current = this.membersPage();
      if (current > total) {
        this.membersPage.set(total);
      }
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  refreshUsers() {
    this.loadUsers();
  }

  selectUser(userId: string) {
    if (!userId || this.selectedUserId() === userId) {
      return;
    }
    this.selectedUserId.set(userId);
    this.members.set([]);
    this.loadMembers(userId);
  }

  planLabelKey(code: SubscriptionPlanCode | null) {
    if (!code) {
      return CONSTANTS.SUBSCRIPTION_SETTINGS_NONE;
    }
    return this.planKeyMap[code] ?? CONSTANTS.SUBSCRIPTION_SETTINGS_NONE;
  }

  setUserSort(field: UserSortField) {
    this.userSort.update((current) => {
      if (current?.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { field, direction: 'asc' };
    });
  }

  setMemberSort(field: MemberSortField) {
    this.memberSort.update((current) => {
      if (current?.field === field) {
        return {
          field,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { field, direction: 'asc' };
    });
  }

  updateUserFilter(field: keyof UserFilters, value: string) {
    this.userFilters.update((filters) => ({
      ...filters,
      [field]: value,
    }));
    this.userPage.set(1);
  }

  updateMemberFilter(field: keyof MemberFilters, value: string) {
    this.memberFilters.update((filters) => ({
      ...filters,
      [field]: value,
    }));
    this.membersPage.set(1);
  }

  changeUserPage(delta: number) {
    const next = this.userPage() + delta;
    const total = this.userTotalPages();
    if (next < 1 || next > total) {
      return;
    }
    this.userPage.set(next);
  }

  changeMemberPage(delta: number) {
    const next = this.membersPage() + delta;
    const total = this.memberTotalPages();
    if (next < 1 || next > total) {
      return;
    }
    this.membersPage.set(next);
  }

  updateUserPageSize(size: number) {
    this.userPageSize.set(size);
    this.userPage.set(1);
  }

  updateMemberPageSize(size: number) {
    this.membersPageSize.set(size);
    this.membersPage.set(1);
  }

  private loadUsers() {
    this.loadingUsers.set(true);
    this.usersError.set(null);
    this.adminService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.loadingUsers.set(false);
          const currentId = this.selectedUserId();
          const nextId = users.find((user) => user.id === currentId)
            ? currentId
            : users[0]?.id ?? null;
          this.selectedUserId.set(nextId);
          this.userPage.set(1);
          if (nextId) {
            this.loadMembers(nextId);
          } else {
            this.members.set([]);
          }
        },
        error: (err) => {
          this.loadingUsers.set(false);
          this.usersError.set(
            this.resolveError(err, CONSTANTS.ADMIN_LOAD_USERS_ERROR),
          );
          this.selectedUserId.set(null);
          this.members.set([]);
        },
      });
  }

  private loadMembers(userId: string) {
    if (!userId) {
      return;
    }
    this.loadingMembers.set(true);
    this.membersError.set(null);
    this.adminService
      .getMembers(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (members) => {
          this.members.set(members);
          this.loadingMembers.set(false);
          this.membersPage.set(1);
        },
        error: (err) => {
          this.loadingMembers.set(false);
          this.membersError.set(
            this.resolveError(err, CONSTANTS.ADMIN_LOAD_MEMBERS_ERROR),
          );
        },
      });
  }

  private matchesUserFilters(
    user: AdminUserSummary,
    filters: UserFilters,
  ): boolean {
    const name = `${user.displayName ?? ''} ${user.email ?? ''}`.trim();
    const lastChange = user.lastMemberChangeAt
      ? this.formatDate(user.lastMemberChangeAt)
      : this.translate.instant(CONSTANTS.ADMIN_LAST_CHANGE_NEVER);
    const planLabel = this.translate.instant(this.planLabelKey(user.subscriptionPlan));
    return (
      this.containsText(name, filters.user) &&
      this.containsText(user.language, filters.language) &&
      this.containsNumber(user.memberCount, filters.members) &&
      this.containsNumber(user.profileCount, filters.profiles) &&
      this.containsNumber(user.dataRecords, filters.dataUsage) &&
      this.containsText(lastChange, filters.lastChange) &&
      this.containsText(planLabel, filters.plan)
    );
  }

  private matchesMemberFilters(
    member: AdminMemberDetail,
    filters: MemberFilters,
  ): boolean {
    const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
    const lastChange = member.updatedAt ?? member.createdAt;
    const lastChangeText = this.formatDate(lastChange);
    return (
      this.containsText(fullName, filters.name) &&
      this.containsText(member.role, filters.role) &&
      this.containsText(member.relationLabel ?? '', filters.relation) &&
      this.containsText(
        member.isAlive
          ? this.translate.instant(CONSTANTS.ADMIN_MEMBER_ALIVE)
          : this.translate.instant(CONSTANTS.ADMIN_MEMBER_DECEASED),
        filters.status,
      ) &&
      this.containsText(lastChangeText, filters.lastChange) &&
      this.containsNumber(member.dataUsage, filters.dataUsage)
    );
  }

  private compareUsers(
    a: AdminUserSummary,
    b: AdminUserSummary,
    field: UserSortField,
    direction: SortDirection,
  ): number {
    const dir = direction === 'asc' ? 1 : -1;
    const getValue = (user: AdminUserSummary) => {
      switch (field) {
        case 'user':
          return `${user.displayName ?? ''} ${user.email ?? ''}`.trim().toLowerCase();
        case 'language':
          return user.language;
        case 'memberCount':
          return user.memberCount;
        case 'profileCount':
          return user.profileCount;
        case 'dataRecords':
          return user.dataRecords;
        case 'lastMemberChangeAt':
          return user.lastMemberChangeAt ?? '';
        case 'subscriptionPlan':
          return this.planLabelKey(user.subscriptionPlan);
        default:
          return '';
      }
    };
    const valA = getValue(a);
    const valB = getValue(b);
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir;
    }
    return String(valA).localeCompare(String(valB)) * dir;
  }

  private compareMembers(
    a: AdminMemberDetail,
    b: AdminMemberDetail,
    field: MemberSortField,
    direction: SortDirection,
  ): number {
    const dir = direction === 'asc' ? 1 : -1;
    const getValue = (member: AdminMemberDetail) => {
      switch (field) {
        case 'name':
          return `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim().toLowerCase();
        case 'role':
          return member.role ?? '';
        case 'relation':
          return member.relationLabel ?? '';
        case 'status':
          return member.isAlive ? 'alive' : 'deceased';
        case 'lastChange':
          return member.updatedAt ?? member.createdAt ?? '';
        case 'dataUsage':
          return member.dataUsage;
        default:
          return '';
      }
    };
    const valA = getValue(a);
    const valB = getValue(b);
    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * dir;
    }
    return String(valA).localeCompare(String(valB)) * dir;
  }

  private containsText(value: string | null | undefined, filter: string) {
    if (!filter) {
      return true;
    }
    return (value ?? '').toLowerCase().includes(filter.toLowerCase());
  }

  private containsNumber(value: number | null | undefined, filter: string) {
    if (!filter) {
      return true;
    }
    return String(value ?? '').includes(filter);
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return '';
    }
    return new Date(value).toLocaleString();
  }

  private resolveError(err: unknown, fallbackKey: string) {
    const fallback = this.translate.instant(fallbackKey);
    if (!err) {
      return fallback;
    }
    const message =
      (err as any)?.error?.message ??
      (err as any)?.error ??
      (err as any)?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
    return fallback;
  }
}
