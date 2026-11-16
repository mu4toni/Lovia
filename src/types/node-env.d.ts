declare module 'net' {
  export function isIP(input: string): number;
  export function isIPv4(input: string): boolean;
  export function isIPv6(input: string): boolean;
}

declare module 'dns/promises' {
  export interface LookupAddress {
    address: string;
    family: number;
  }
  export function lookup(hostname: string): Promise<LookupAddress>;
  export function lookup(
    hostname: string,
    options: { all: true; family?: number }
  ): Promise<LookupAddress[]>;
  export function lookup(
    hostname: string,
    options: { all?: false; family?: number }
  ): Promise<LookupAddress>;
}
