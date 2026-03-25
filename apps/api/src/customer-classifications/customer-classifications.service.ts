import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomerClassificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.customerClassification.findMany({
        orderBy: [{ sortOrder: 'asc' }, { labelHe: 'asc' }],
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') {
        return this.prisma.$queryRawUnsafe(
          `SELECT * FROM "CustomerClassification" ORDER BY "sortOrder" ASC, "labelHe" ASC`,
        );
      }
      throw e;
    }
  }

  /** מספר סידורי הבא — ללא aggregate (יציב יותר עם adapter-pg) */
  private async nextSortOrder(): Promise<number> {
    try {
      const last = await this.prisma.customerClassification.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      return (last?.sortOrder ?? 0) + 1;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') {
        const rows = await this.prisma.$queryRawUnsafe<{ m: number | bigint }[]>(
          `SELECT COALESCE(MAX("sortOrder"), 0) AS m FROM "CustomerClassification"`,
        );
        const m = rows[0]?.m;
        return Number(m ?? 0) + 1;
      }
      throw e;
    }
  }

  /**
   * יצירת סיווג: שימוש ב-$executeRaw (תבנית פרמטרית) במקום prisma.create.
   * עם @prisma/adapter-pg, create לעיתים זורק שגיאה לא מטופלת (500) בעוד INSERT פרמטרי עובד,
   * כולל עברית ב-labelHe.
   */
  async create(labelHe: string) {
    const label = (labelHe || '').trim();
    if (label.length < 1) {
      throw new BadRequestException('נא להזין שם לסיווג');
    }
    if (label.length > 120) {
      throw new BadRequestException('שם הסיווג ארוך מדי');
    }

    let sortOrder: number;
    try {
      sortOrder = await this.nextSortOrder();
    } catch {
      throw new BadRequestException(
        'לא ניתן לקרוא סדר מיון מבסיס הנתונים. ודא שמיגרציות הוחלו (טבלת CustomerClassification).',
      );
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      const code = `C_${randomBytes(4 + Math.min(attempt, 4)).toString('hex')}`;
      const id = randomUUID();

      try {
        await this.prisma.$executeRaw`
          INSERT INTO "CustomerClassification" ("id", "code", "labelHe", "sortOrder", "isPreset", "createdAt")
          VALUES (${id}, ${code}, ${label}, ${sortOrder}, ${false}, NOW())
        `;

        try {
          const row = await this.prisma.customerClassification.findUnique({ where: { id } });
          if (row) return row;
        } catch {
          /* P2022 וכו' — מחזירים אובייקט תואם ל-API */
        }

        return {
          id,
          code,
          labelHe: label,
          sortOrder,
          isPreset: false,
          createdAt: new Date(),
        };
      } catch (e) {
        const dup =
          (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') ||
          (e instanceof Error && /23505|unique|duplicate/i.test(e.message));
        if (dup) {
          continue;
        }

        throw new BadRequestException(
          'שמירת הסיווג נכשלה. ודא שמיגרציות Prisma הוחלו (CustomerClassification) ושבסיס הנתונים זמין.',
        );
      }
    }

    throw new BadRequestException('לא ניתן ליצור קוד ייחודי לסיווג — נסה שוב');
  }
}
