// Minimal Web Bluetooth typings for TypeScript
// These cover the subset used by the POS app.

interface RequestDeviceOptions {
  acceptAllDevices?: boolean
  optionalServices?: Array<number | string>
}

interface NavigatorBluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
}

interface BluetoothDevice {
  gatt: BluetoothRemoteGATTServer | null
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>
  getPrimaryService(uuid: number | string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: number | string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
}

declare global {
  interface Navigator {
    bluetooth: NavigatorBluetooth
  }
}
