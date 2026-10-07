// react-test-renderer ships without types and @types/react-test-renderer is not installed; only the subset the tests use.
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export type ReactTestInstance = {
    type: unknown;
    props: Record<string, any>;
    children: (ReactTestInstance | string)[];
    findByProps(props: Record<string, unknown>): ReactTestInstance;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
  };
  export function create(element: ReactElement): { root: ReactTestInstance };
  export function act(callback: () => void | unknown): void;
}
