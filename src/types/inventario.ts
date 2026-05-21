export interface NetworkAdapter {
  type: string;
  description: string;
  mac: string;
  manufacturer: string;
  status: string;
  connectionName: string;
  speed: string;
}

export interface TcpConfig {
  adapterName: string;
  ipType: string;
  ip: string;
  mask: string;
  gateway: string;
  dns: string[];
}

export interface DiskDetail {
  caption: string;
  deviceId: string;
  interfaceType: string;
  model: string;
  partitions: string;
  sizeMB: string;
  status: string;
}

export interface Partition {
  drive: string;
  sizeMB: string;
  type: string;
  freeSpaceMB: string;
}

export interface LocalUser {
  login: string;
  fullName: string;
  description: string;
  status: string;
  groups: string;
}

export interface Service {
  name: string;
  startup: string;
  status: string;
  user: string;
}

export interface Share {
  name: string;
  path: string;
}

export interface PrinterPort {
  type: string;
  host: string;
  port: string;
  protocol: string;
}

export interface MemorySlot {
  slot: string;
  sizeMB: string;
  type: string;
  status: string;
}

export interface MachineInventory {
  id: string;
  machineName: string;
  uploadDate: string;
  fileName: string;

  // OS
  osName: string;
  osVersion: string;
  servicePack: string;
  bootDevice: string;
  installDir: string;
  registeredUser: string;
  serialNumber: string;
  timeZone: string;

  // Processor
  processorFamily: string;
  processorName: string;
  processorSpeed: string;

  // BIOS/Hardware
  manufacturer: string;
  serviceTag: string;
  biosVersion: string;
  biosDate: string;
  model: string;

  // Memory
  memorySlots: MemorySlot[];
  totalMemoryMB: number;
  pageFileLocation: string;
  pageFileSizeMB: string;

  // Network
  networkAdapters: NetworkAdapter[];
  tcpConfigs: TcpConfig[];
  primaryIP: string;

  // Disks
  diskDetails: DiskDetail[];
  partitions: Partition[];

  // Users
  localUsers: LocalUser[];

  // Software
  softwareList: string[];

  // Services
  services: Service[];

  // Shares
  shares: Share[];

  // Printers
  printerDrivers: string[];
  printerPorts: PrinterPort[];
}
