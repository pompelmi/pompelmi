export const metadata = { title: "pompelmi • Next App Router demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
