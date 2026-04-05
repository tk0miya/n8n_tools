declare module "castv2-player" {
  export interface Device {
    id: string;
    name: string;
    host: string;
    port: number;
    type: string;
    registerForUpdates(cb: (device: Device) => void): void;
  }

  export interface ScannerOptions {
    scanInterval?: number;
    name?: string;
    maxMatches?: number;
  }

  export interface ScannerInstance {
    destroy(): void;
  }

  export type ScannerClass = new (cb: (device: Device) => void, options?: ScannerOptions) => ScannerInstance;
  export type ScannerFactory = (logClass?: unknown) => ScannerClass;
  export const Scanner: ScannerFactory;

  export interface MediaPlayerInstance {
    playAnnouncementPromise(url: string | { url: string; volume?: number }): Promise<void>;
    playUrlPromise(url: string): Promise<void>;
    close(): void;
  }

  export type MediaPlayerClass = new (device: Device) => MediaPlayerInstance;
  export type MediaPlayerFactory = (logClass?: unknown) => MediaPlayerClass;
  export const MediaPlayer: MediaPlayerFactory;

  export type ScannerPromiseFn = (name?: string) => Promise<Device>;
  export type ScannerPromiseFactory = (logClass?: unknown) => ScannerPromiseFn;
  export const ScannerPromise: ScannerPromiseFactory;
}
