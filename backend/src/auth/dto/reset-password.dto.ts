import { IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty()
  token!: string;

  @IsNotEmpty()
  @MinLength(10)
  @Matches(/[a-z]/)
  @Matches(/[A-Z]/)
  @Matches(/\d/)
  @Matches(/[^A-Za-z0-9]/)
  password!: string;

  @IsNotEmpty()
  confirmPassword!: string;
}
