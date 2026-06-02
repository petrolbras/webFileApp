import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { json } from '@sveltejs/kit';

const STORAGE_DIR = path.resolve('storage');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function GET({ url }) {
    const filePath = url.searchParams.get('path');
        
    if (!filePath) {
        return json({ error: 'Missing filePath parameter' }, { status: 400 });
    }

    const safefilePath = path.resolve(STORAGE_DIR, filePath);

    const resolvedStorageDir = path.resolve(STORAGE_DIR);

    if (!safefilePath.startsWith(resolvedStorageDir)) {
        return json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
        await fs.access(safefilePath);

        const headers = {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${path.basename(safefilePath)}"`
            }

        const fileStream = createReadStream(safefilePath);
        return new Response(fileStream as any, { headers });

    } catch (err) {
        return json({ error: 'File not found' }, { status: 404 });
    }
}