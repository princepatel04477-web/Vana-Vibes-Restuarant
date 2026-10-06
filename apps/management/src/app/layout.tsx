import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

const generalSans = localFont({
  src: [
    {
      path: '../../public/fonts/GeneralSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/GeneralSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/GeneralSans-Semibold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/GeneralSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vaan Vibes Cafe & Restro — Management Portal',
  description: 'Operations console for Administrators and Kitchen Chefs at Vaan Vibes Cafe & Restro.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={generalSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function cleanAttr(node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                    if (node.hasAttribute('data-gr-ext-installed')) node.removeAttribute('data-gr-ext-installed');
                    if (node.hasAttribute('data-new-gr-c-s-check-loaded')) node.removeAttribute('data-new-gr-c-s-check-loaded');
                  }
                  if (typeof MutationObserver !== 'undefined') {
                    var obs = new MutationObserver(function(muts) {
                      for (var i = 0; i < muts.length; i++) {
                        var m = muts[i];
                        if (m.type === 'attributes') {
                          if (m.attributeName === 'bis_skin_checked' || m.attributeName === 'data-gr-ext-installed') {
                            m.target.removeAttribute(m.attributeName);
                          }
                        } else if (m.type === 'childList') {
                          for (var j = 0; j < m.addedNodes.length; j++) {
                            var n = m.addedNodes[j];
                            cleanAttr(n);
                            if (n.querySelectorAll) {
                              var list = n.querySelectorAll('[bis_skin_checked]');
                              for (var k = 0; k < list.length; k++) list[k].removeAttribute('bis_skin_checked');
                            }
                          }
                        }
                      }
                    });
                    obs.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked', 'data-gr-ext-installed'] });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-brand-beige-light text-brand-green min-h-screen font-sans" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
