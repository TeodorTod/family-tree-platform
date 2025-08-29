// src/media/media.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { writeFile, mkdir, stat, unlink } from 'fs/promises';
import { join, basename, dirname, extname, normalize, sep } from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { createReadStream } from 'fs';

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

const IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

const VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'application/x-matroska',
]);

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

  private isImage(mime: string, filename?: string) {
    const ext = (filename ?? '').toLowerCase();
    return IMAGE_MIME.has(mime) || /\.(png|jpe?g|webp|gif|svg)$/.test(ext);
  }

  private isVideo(mime: string, filename?: string) {
    const ext = (filename ?? '').toLowerCase();
    return VIDEO_MIME.has(mime) || /\.(mp4|webm|mov|mkv|avi)$/.test(ext); // <-- ext fallback
  }

  private subdirFor(mime: string, filename?: string) {
    if (this.isImage(mime, filename)) return 'images';
    if (this.isVideo(mime, filename)) return 'videos';
    return 'files';
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

  private mediaRoot(): string {
    const root = process.env.MEDIA_ROOT?.trim();
    return root && root.length > 0
      ? root
      : join(process.cwd(), 'public', 'uploads'); // fallback
  }

  private ensureUnderRoot(absPath: string) {
    const root = normalize(this.mediaRoot());
    const target = normalize(absPath);
    if (!target.startsWith(root)) {
      throw new BadRequestException('Invalid path');
    }
  }

  async saveForMember(
    memberId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    if (!file?.buffer) throw new BadRequestException('Empty file');

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');

    const folder = join(
      this.mediaRoot(),
      userId ?? 'user',
      memberId,
      this.subdirFor(file.mimetype, file.originalname),
      y,
      m,
    );
    await mkdir(folder, { recursive: true });

    const safeName = (file.originalname || 'file')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 100);

    const unique = `${crypto.randomUUID()}_${safeName}`;
    const ext = extname(unique) || '';
    const absPath = normalize(join(folder, unique));
    await writeFile(absPath, file.buffer);

    try {
      if (this.isImage(file.mimetype, file.originalname)) {
        await this.tryGenerateImagePreview(absPath);
      } else if (this.isVideo(file.mimetype, file.originalname)) {
        await this.tryGenerateVideoPoster(absPath);
      }
    } catch (e) {
      console.warn('Formatting failed:', (e as Error).message);
    }

    // Save EXACT PATH in DB
    const created = await this.prisma.media.create({
      data: {
        memberId,
        url: absPath, // exact absolute path
        type: file.mimetype,
        caption: null,
      },
    });

    return { id: created.id, path: absPath };
  }

  async listByMember(memberId: string) {
    return this.prisma.media.findMany({
      where: { memberId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  openReadStream(absPath: string) {
    this.ensureUnderRoot(absPath);
    return createReadStream(absPath);
  }

  async stat(pathAbs: string) {
    this.ensureUnderRoot(pathAbs);
    return stat(pathAbs);
  }

  // ---- helpers: optional formatting ----
  private async tryGenerateImagePreview(absPath: string) {
    // requires "sharp" (optional). If unavailable, silently skip.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const out = absPath.replace(/(\.\w+)$/, '_preview.jpg');
      await sharp(absPath)
        .rotate()
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toFile(out);
    } catch {}
  }

  private async tryGenerateVideoPoster(absPath: string) {
    // requires fluent-ffmpeg + ffmpeg installed (optional)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ffmpeg = require('fluent-ffmpeg');
      const out = absPath.replace(/(\.\w+)$/, '_poster.jpg');
      await new Promise<void>((resolve, reject) => {
        ffmpeg(absPath)
          .screenshots({
            count: 1,
            timemarks: ['1'],
            filename: out.split(sep).pop(),
            folder: dirname(out),
            size: '1280x?',
          })
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err));
      });
    } catch {}
  }

  async deleteManyByUrls(memberId: string, urls: string[]) {
    // Find rows that actually belong to this member & match urls
    const rows = await this.prisma.media.findMany({
      where: { memberId, url: { in: urls } },
      select: { id: true, url: true, type: true },
    });

    // Remove files (main + best-effort derived)
    await Promise.allSettled(
      rows.flatMap(({ url, type }) => {
        const tasks: Promise<any>[] = [];
        try {
          this.ensureUnderRoot(url);
        } catch {
          /* skip invalid */ return tasks;
        }
        tasks.push(unlink(url).catch(() => {}));
        // best-effort delete generated assets
        const preview = url.replace(/(\.\w+)$/, '_preview.jpg');
        const poster = url.replace(/(\.\w+)$/, '_poster.jpg');
        if (IMAGE_MIME.has(type)) tasks.push(unlink(preview).catch(() => {}));
        if (VIDEO_MIME.has(type)) tasks.push(unlink(poster).catch(() => {}));
        return tasks;
      }),
    );

    // Delete DB rows
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return 0;

    const result = await this.prisma.media.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count ?? ids.length;
  }
}
