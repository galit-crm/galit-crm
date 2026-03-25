# סנכרון DB עם Prisma (User + הרשאות)

## מה נוסף ל-`User` (בסכמה מול DB ישן)

אם ה-DB נוצר לפני השדות הבאים, ייתכן שחסרים עמודות. המיגרציה `20260318120000_user_permissions_presence` מוסיפה (בלי מחיקות):

- `serviceDepartments` (TEXT[])
- `canViewFinance`, `canEditFinance`, `canDeleteCustomers`, `canDeleteLeads`, `canManageUsers`, `canManagePermissions`, `canViewAllRecords`
- `workStatus`, `isOnline`, `lastSeenAt`, `currentWorkMode`, `currentProjectId`
- ערכי enum ב-`UserRole`: `EXPERT`, `BILLING`
- enums: `WorkStatus`, `WorkMode` (אם חסרים)
- FK: `User_currentProjectId_fkey` → `Project(id)`

## פקודות מקומיות (מתוך `apps/api`)

הגדר `DATABASE_URL` (או ב-`.env`) לאותו PostgreSQL שבו רץ השרת.

```powershell
cd apps/api
npx prisma generate
npx prisma migrate deploy
```

אלטרנטיבה לפיתוח (בלי היסטוריית migrate, רק דחיפת סכמה):

```powershell
npx prisma db push
```

לאחר מכן (אופציונלי) משתמשי דמו:

```powershell
npm run seed:demo
```

## Login

- אחרי `migrate deploy` / `db push`, `findFirst` על `User` אמור לעבוד.
- אם עדיין יש drift זמני, `UsersService.login` נופל ל-raw query רק על שגיאות Prisma `P2022` / `P2010`.

## Build

```powershell
cd apps/api
npm run build
```
