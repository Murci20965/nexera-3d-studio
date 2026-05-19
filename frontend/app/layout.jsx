import "./globals.css";

export const metadata = {
  title: "Nexera 3D Studio",
  description: "Generate 3D models from text or image",
};

// Runs synchronously before first paint — reads localStorage / system preference
// and sets data-theme on <html> so CSS variables are correct from frame 0.
const themeInitScript = `
try {
  var t = localStorage.getItem('nexera-theme');
  if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
} catch(e) {}
`.trim();

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="app-shell" suppressHydrationWarning>{children}</body>
    </html>
  );
}
