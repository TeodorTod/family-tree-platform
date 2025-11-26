import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContactTopic } from '../contact-topic.enum';

export class ContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsEnum(ContactTopic)
  topic!: ContactTopic;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;

  @IsBoolean()
  consent!: boolean;

  @IsOptional()
  @IsIn(['bg', 'en'])
  lang?: 'bg' | 'en';

  @IsString()
  @MinLength(10)
  recaptchaToken!: string;
}

