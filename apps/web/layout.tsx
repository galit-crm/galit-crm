export const metadata = {
  title: 'Galit CRM',
  description: 'מערכת CRM לחברת גלית',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}