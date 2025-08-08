import Quill from 'quill';

declare module 'react-quill' {
  interface ReactQuill {
    register: (name: string, module: any) => void;
  }
  interface UnprivilegedEditor {}
}