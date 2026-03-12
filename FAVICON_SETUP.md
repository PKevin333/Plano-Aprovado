# 🚀 Favicon Setup — Rocket Icon

## Arquivos gerados
- `favicon.ico` — favicon principal (16x16 e 32x32)
- `favicon-32x32.png` — PNG 32x32
- `favicon-192.png` — PNG 192x192 (PWA / Android)

---

## ✅ React + Vite

1. Copie os 3 arquivos para a pasta **`public/`** do seu projeto.

2. Edite o **`index.html`** na raiz do projeto:

```html
<head>
  <!-- Substitua ou adicione estas linhas -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png" />
</head>
```

---

## ✅ Next.js (App Router — `app/`)

1. Copie **`favicon.ico`** para **`app/favicon.ico`** (o Next.js detecta automaticamente).
2. Para ícones adicionais, edite **`app/layout.tsx`**:

```tsx
export const metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/favicon-192.png', sizes: '192x192' }],
  },
}
```

3. Copie `favicon-32x32.png` e `favicon-192.png` para **`public/`**.

---

## ✅ Next.js (Pages Router — `pages/`)

1. Copie todos os arquivos para **`public/`**.
2. Edite **`pages/_document.tsx`** (ou `_document.js`):

```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/favicon-192.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

---

## 🚀 Deploy no Railway

Depois de aplicar as mudanças:

```bash
git add public/favicon.ico public/favicon-32x32.png public/favicon-192.png index.html
git commit -m "feat: add rocket favicon"
git push origin main
```

O Railway vai detectar o push e fazer o redeploy automaticamente. ✅
