declare const __APP_VERSION__: string;

interface Window {
  electronAPI?: {
    getVersion: () => Promise<string>;
  };
}
