import './globals.css';
import UiTranslationApplier from './UiTranslationApplier';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        {children}
        <UiTranslationApplier />
      </body>
    </html>
  );
}