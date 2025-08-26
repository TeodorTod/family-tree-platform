// src/media/media.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async uploadToLocalOrCloud(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer) throw new BadRequestException('Empty file');

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const uploadsDir = join(process.cwd(), 'public', 'uploads', year, month);
    await mkdir(uploadsDir, { recursive: true });

    const ext = EXT_BY_MIME[file.mimetype] ?? 'bin';
    const orig = basename(file.originalname || 'file')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 80);
    const uniqueName = `${crypto.randomUUID()}-${orig}.${ext}`;
    const filePath = join(uploadsDir, uniqueName);

    await writeFile(filePath, file.buffer);
    return `/uploads/${year}/${month}/${uniqueName}`;
  }

  async saveMemberFile(
    memberId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const url = await this.uploadToLocalOrCloud(file);
    await this.prisma.media.create({
      data: {
        memberId,
        url,
        type: file.mimetype,
        caption: null,
      },
    });
    return { url };
  }
}
