/** Generate CSS that overrides Tailwind orange classes with the shop's primary color */
export function shopColorCSS(primary: string): string {
  return `
    .bg-orange-500 { background-color: ${primary} !important; }
    .hover\\:bg-orange-500:hover { background-color: ${primary} !important; }
    .hover\\:bg-orange-600:hover { background-color: ${primary} !important; }
    .bg-orange-50 { background-color: ${primary}18 !important; }
    .hover\\:bg-orange-50:hover { background-color: ${primary}18 !important; }
    .bg-orange-100 { background-color: ${primary}25 !important; }
    .text-orange-400 { color: ${primary}aa !important; }
    .text-orange-500 { color: ${primary} !important; }
    .text-orange-600 { color: ${primary} !important; }
    .text-orange-700 { color: ${primary} !important; }
    .hover\\:text-orange-500:hover { color: ${primary} !important; }
    .hover\\:text-orange-600:hover { color: ${primary} !important; }
    .border-orange-200 { border-color: ${primary}55 !important; }
    .border-orange-300 { border-color: ${primary}88 !important; }
    .border-orange-400 { border-color: ${primary}aa !important; }
    .border-orange-500 { border-color: ${primary} !important; }
    .hover\\:border-orange-300:hover { border-color: ${primary}88 !important; }
    .group:hover .group-hover\\:text-orange-500 { color: ${primary} !important; }
    .ring-orange-400 { --tw-ring-color: ${primary}aa; }
  `.trim();
}
