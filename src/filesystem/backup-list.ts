'use client';

/**
 * Hook que lista arquivos de backup (.json) da pasta /Backups conectada.
 * Re-carrega quando a conexão da pasta muda.
 */

import { useEffect, useState } from 'react';
import { listBackupFiles } from '@/filesystem';

export interface FolderBackupFile {
  name: string;
  handle: {
    name: string;
    getFile(): Promise<File>;
  };
}

export function useBackups(enabled: boolean): FolderBackupFile[] {
  const [files, setFiles] = useState<FolderBackupFile[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    listBackupFiles().then((items) => {
      if (!cancelled) setFiles(items);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Deriva o estado vazio sem setState síncrono no efeito
  return enabled ? files : [];
}
