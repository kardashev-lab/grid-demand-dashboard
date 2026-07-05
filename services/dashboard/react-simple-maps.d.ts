// minimal types for react-simple-maps since the lib doesn't ship its own

declare module 'react-simple-maps' {
  import { ComponentType, CSSProperties, ReactNode, SVGProps } from 'react';

  export interface GeographyData {
    rsmKey: string;
    id?: string | number;
    properties: Record<string, unknown>;
  }

  export interface GeographiesChildrenArg {
    geographies: GeographyData[];
  }

  export const ComposableMap: ComponentType<{
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    style?: CSSProperties;
    children?: ReactNode;
  }>;

  export const Geographies: ComponentType<{
    geography: string | object;
    children: (arg: GeographiesChildrenArg) => ReactNode;
  }>;

  // style accepts either plain CSS or a per-state-mode object
  type GeographyStyle =
    | CSSProperties
    | {
        default?: CSSProperties;
        hover?: CSSProperties;
        pressed?: CSSProperties;
      };

  export const Geography: ComponentType<
    Omit<SVGProps<SVGPathElement>, 'style'> & {
      geography: GeographyData;
      style?: GeographyStyle;
    }
  >;
}
