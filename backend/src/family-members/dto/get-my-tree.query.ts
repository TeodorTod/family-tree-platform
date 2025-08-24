import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export function toCsvArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => String(v).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export const FIELD_WHITELIST = [
  'id',
  'role',
  'firstName',
  'middleName',
  'lastName',
  'gender',
  'dob',
  'birthYear',
  'birthNote',
  'dod',
  'deathYear',
  'deathNote',
  'isAlive',
  'photoUrl',
  'relationLabel',
  'translatedRole',
  'partnerId',
  'partnerStatus',
  'createdAt',
  'updatedAt',
] as const;

export const WITH_WHITELIST = [
  'parentOf',
  'childOf',
  'media',
  'profile',
] as const;

export class GetMyTreeQuery {
  @IsOptional()
  @Transform(({ value }) => toCsvArray(value))
  @IsIn(FIELD_WHITELIST as readonly string[], { each: true })
  fields?: string[];

  @IsOptional()
  @Transform(({ value }) => toCsvArray(value))
  @IsIn(WITH_WHITELIST as readonly string[], { each: true })
  with?: string[];
}
