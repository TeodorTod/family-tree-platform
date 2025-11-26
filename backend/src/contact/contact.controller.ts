import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './dto/contact-message.dto';
import { RecaptchaGuard } from '../recaptcha/recaptcha.guard';

@Controller('support/contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @UseGuards(RecaptchaGuard('contact'))
  @Post()
  async submit(@Body() dto: ContactMessageDto) {
    await this.contactService.submit(dto);
    return { ok: true };
  }
}

