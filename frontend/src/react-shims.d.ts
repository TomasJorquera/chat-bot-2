// Minimal React JSX/type shims for projects without full @types/react installed
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function jsxDEV(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    // allow any html element
    [elemName: string]: any;
  }
}
