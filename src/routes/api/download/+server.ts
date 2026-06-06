import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { zipSync } from 'fflate';
import { json } from '@sveltejs/kit';

const STORAGE_DIR = path.resolve('storage');

export function _buildZipPayload(dirPath: string, baseDir: string): Record<string, Uint8Array> {
    const files: Record<string, Uint8Array> = {};
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const relativePath = path.relative(baseDir, itemPath);

        if (item.isDirectory()) {
            Object.assign(files, _buildZipPayload(itemPath, baseDir));
        } else if (item.isFile()) {
            const fileData = fs.readFileSync(itemPath);
            files[relativePath] = new Uint8Array(fileData);
        }
    }

    return files;
}

export async function GET({ url }) {
    const filePath = url.searchParams.get('path');
    let filehandle: fsp.FileHandle | undefined;
        
    if (!filePath) {
        return json({ error: 'Missing filePath parameter' }, { status: 400 });
    }

    const safefilePath = path.resolve(STORAGE_DIR, filePath);

    const resolvedStorageDir = path.resolve(STORAGE_DIR);

    if (!safefilePath.startsWith(resolvedStorageDir)) {
        return json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
        let stat = await fsp.stat(safefilePath);

        if (stat.isDirectory()) {

            const zipData = _buildZipPayload(safefilePath, safefilePath);

            const zippedBuffer = zipSync(zipData, { level: 6 });

            const headers = {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${path.basename(safefilePath)}.zip"`
            }

            return new Response(zippedBuffer, { headers });
        } else {
            const headers = {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${path.basename(safefilePath)}"`
            }

            filehandle = await fsp.open(safefilePath);
            const filestream = filehandle.readableWebStream();

            return new Response(filestream as any, { headers });
        }

    } catch (err) {
        return json({ error: err instanceof Error ? err.message : 'Error processing file' }, { status: 500 });
    } finally {
        if (filehandle) {
            await filehandle.close();
        }
    }
}
