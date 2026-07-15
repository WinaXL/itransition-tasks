/// <reference types="vite/client" />

declare module "react-tagcloud" {
  import { ComponentType } from "react";
  export const TagCloud: ComponentType<{
    minSize: number;
    maxSize: number;
    tags: { value: string; count: number }[];
    onClick?: (tag: { value: string; count: number }) => void;
    className?: string;
    disableRandomColor?: boolean;
  }>;
}
