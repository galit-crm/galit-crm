import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FollowupImportService } from './followup-import.service';
import type { ImportEntityKind } from './followup-mapper';

type Uploaded = { buffer: Buffer; originalname: string; mimetype: string };

@Controller('followup-import')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class FollowupImportController {
  private readonly log = new Logger(FollowupImportController.name);
  constructor(private readonly svc: FollowupImportService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 52 * 1024 * 1024 },
    }),
  )
  async upload(@UploadedFile() file: Uploaded | undefined, @Req() req: any) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('חסר קובץ');
    }
    const userId = req.user?.id as string | undefined;
    const userRole = req.user?.role as string | undefined;
    try {
      return await this.svc.saveUpload(file, userId, userRole);
    } catch (e: any) {
      this.log.error('followup upload failed', {
        message: e?.message,
        stack: e?.stack,
        file: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.buffer?.length ?? 0,
        },
        user: { id: userId || null, role: userRole || null },
      });
      if (e?.response?.message) {
        throw e;
      }
      throw new InternalServerErrorException('Upload failed');
    }
  }

  @Post(':id/preview')
  async preview(
    @Param('id') id: string,
    @Body() body: { sheetEntity?: ImportEntityKind },
  ) {
    return this.svc.buildPreview(id, body?.sheetEntity ?? 'auto');
  }

  @Post(':id/run')
  async run(
    @Param('id') id: string,
    @Body() body: { sheetEntity?: ImportEntityKind },
  ) {
    return this.svc.execute(id, body?.sheetEntity ?? 'auto');
  }

  @Get('jobs')
  async jobs() {
    return this.svc.listJobs(40);
  }

  /** לפני jobs/:id — נתיב ספציפי יותר */
  @Get('jobs/:id/errors')
  async errors(@Param('id') id: string) {
    return this.svc.listErrors(id);
  }

  @Get('jobs/:id')
  async job(@Param('id') id: string) {
    return this.svc.getJob(id);
  }
}
