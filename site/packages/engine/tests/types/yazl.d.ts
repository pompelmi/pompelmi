declare module 'yazl' {
  export class ZipFile {
    outputStream: any;
    addBuffer(buf: Buffer, metadataPath: string): void;
    end(): void;
  }
}
