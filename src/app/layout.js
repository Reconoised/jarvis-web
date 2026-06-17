import "./globals.css";

export const metadata = {
  title: "Jarvis | Antigravity OS",
  description: "Il Secondo Cervello guidato dall'Intelligenza Artificiale",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Jarvis",
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
