import path from 'path';
import fs from 'fs';
import { formatBytes } from '$lib/FormatBytes';

const ROOT_DIR = path.resolve('storage');

export async function GET({ url }: { url: URL }) {
    const query = url.searchParams.get('query') || '';

    if (!query) {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const results = await searchFiles(query, ROOT_DIR);

    return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
    });
};


async function searchFiles(query: string, currentDir: string): Promise<FileItem[]> {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    const results: FileItem[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const entry of entries) {
        if (entry.isDirectory()) {

            if (entry.name.toLowerCase().includes(normalizedQuery)) {
                results.push({
                    name: entry.name,
                    type: 'folder',
                    size: '',
                    mime: null,
                    path: path.relative(ROOT_DIR, path.join(currentDir, entry.name))
                });
            }

            const subDirPath = path.join(currentDir, entry.name);
            const subResults = await searchFiles(query, subDirPath);

            results.push(...subResults);

        } else if (entry.isFile() && entry.name.toLowerCase().includes(normalizedQuery)) {
            results.push({
                name: entry.name,
                type: 'file',
                size: formatBytes(fs.statSync(path.join(currentDir, entry.name)).size),
                mime: null,
                path: path.relative(ROOT_DIR, path.join(currentDir, entry.name))
            });
        }
    }

    return results.slice(0, 20);
}


interface FileItem {
    name: string;
    type: 'file' | 'folder';
    size: string;
    mime: string | null;
    path: string;
}