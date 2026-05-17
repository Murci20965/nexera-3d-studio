import "./globals.css";

export const metadata = {
  title: "Nexera 3D Studio",
  description: "Generate 3D models from text or image",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">{children}</body>
    </html>
  );
}
