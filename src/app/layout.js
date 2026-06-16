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

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
