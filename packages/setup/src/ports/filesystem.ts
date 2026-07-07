export type TargetFilePort = {
  exists(path: string): Promise<boolean> | boolean;
  copyFile(sourcePath: string, destinationPath: string): Promise<void> | void;
  backupFile(sourcePath: string, backupPath: string): Promise<void> | void;
  writeFileAtomic(path: string, content: Uint8Array): Promise<void> | void;
};
