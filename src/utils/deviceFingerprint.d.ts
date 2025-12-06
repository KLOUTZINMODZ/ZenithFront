export interface DeviceFingerprintSnapshot {
  fingerprint: string;
  components: any;
  timestamp: string;
}

export function generateDeviceFingerprint(): Promise<DeviceFingerprintSnapshot>;
export function getDeviceFingerprint(): Promise<DeviceFingerprintSnapshot>;

declare const deviceFingerprint: any;
export default deviceFingerprint;
