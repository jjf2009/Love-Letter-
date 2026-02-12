export function messageObjectPath(storagePath: string): string {
  return `${storagePath}/message.enc`;
}

export function imageObjectPath(storagePath: string, index: number): string {
  return `${storagePath}/image-${index}.enc`;
}
