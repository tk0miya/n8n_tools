declare module "castv2-client" {
  export interface MediaInfo {
    contentId: string;
    contentType: string;
  }

  export interface LoadOptions {
    autoplay?: boolean;
    currentTime?: number;
  }

  export interface MediaPlayerStatus {
    playerState: "IDLE" | "PLAYING" | "BUFFERING" | "PAUSED";
    idleReason?: "FINISHED" | "ERROR" | "INTERRUPTED" | "CANCELLED";
    media?: { contentId: string; duration?: number };
    currentItemId?: number;
  }

  export interface DefaultMediaReceiverInstance {
    load(media: MediaInfo, options: LoadOptions, callback: (err: Error | null) => void): void;
    on(event: "status", listener: (status: MediaPlayerStatus) => void): this;
    removeListener(event: "status", listener: (status: MediaPlayerStatus) => void): this;
    close(): void;
  }

  export interface DefaultMediaReceiverClass {
    APP_ID: string;
    new (...args: unknown[]): DefaultMediaReceiverInstance;
  }

  export const DefaultMediaReceiver: DefaultMediaReceiverClass;

  export class Client {
    connect(options: { host: string; port: number }, callback: () => void): void;
    launch(
      Application: DefaultMediaReceiverClass,
      callback: (err: Error | null, player: DefaultMediaReceiverInstance) => void,
    ): void;
    close(): void;
    on(event: "error", listener: (err: Error) => void): this;
  }
}
