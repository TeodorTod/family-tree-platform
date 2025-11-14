import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 10 chars and include upper, lower, number and symbol.',
    },
  )
  password: string;

  @IsNotEmpty()
  confirmPassword: string;

  @IsNotEmpty()
  @IsIn(['bg', 'en'])
  language: 'bg' | 'en';
}
