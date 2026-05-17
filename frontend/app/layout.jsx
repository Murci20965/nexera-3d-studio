import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Nexera 3D Studio",
  description: "Generate 3D models from text or image",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-shell">
        {children}
        {/* model-viewer is an ES module custom element — lazyOnload is fine
            because it renders client-side only after hydration */}
        <Script
          type="module"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
