import { Injectable } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  async uploadToLocalOrCloud(file: Express.Multer.File): Promise<string> {
    const uploadsDir = join(__dirname, '..', '..', 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const uniqueName = crypto.randomUUID() + '-' + file.originalname;
    const filePath = join(uploadsDir, uniqueName);
    await writeFile(filePath, file.buffer);

    // For now: serve locally from /public/uploads
    return `/uploads/${uniqueName}`;
  }
}
