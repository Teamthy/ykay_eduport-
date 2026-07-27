// Flat ESLint config for ESLint 9 / Next.js 16.
// Next.js 16 removed `next lint`; run `eslint .` via `npm run lint`.
// eslint-config-next@16 ships a native flat config array, so no FlatCompat needed.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_backups/**",
      "prisma/migrations/**",
      "scripts/**",
      "tests/**",
      "ykay-fixes.patch",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // Match the previous permissive intent (lint never actually ran before).
      "no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // Obsolete in the App Router.
      "@next/next/no-html-link-for-pages": "off",
      // eslint-plugin-react-hooks v6 (shipped with eslint-config-next@16) added
      // aggressive new rules the existing hooks weren't written for. Surface them
      // as warnings so CI is green on day one; promote to errors in a follow-up.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
