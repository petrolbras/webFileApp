import { json } from '@sveltejs/kit';
import path from 'path';
import fs from 'fs/promises';
import { SanitizeName } from '$lib/SanitizeName';
import { GetAvailableName } from '$lib/getAvailableName';

const STORAGE_DIR = path.resolve('storage');

export async function POST({ request }) {
    try {
        const { newName, currentPath, oldName } = await request.json();

        if (!oldName) {
            return json({ error: 'Old name is required' }, { status: 400 });
        }

        if (!newName) {
            return json({ error: 'New name is required' }, { status: 400 });
        }

        const sanitizedNewName = SanitizeName(newName);

        if (!sanitizedNewName) {
            return json({ error: 'Invalid name' }, { status: 400 });
        }

        if (sanitizedNewName === oldName) {
            return json({ error: 'New name is the same as the old name' }, { status: 400 });
        }
        
        const oldPath = path.resolve(STORAGE_DIR, currentPath, oldName);
        const newPath = path.resolve(STORAGE_DIR, currentPath, sanitizedNewName);
        const resolvedStorageDir = path.resolve(STORAGE_DIR);

        if (!oldPath.startsWith(resolvedStorageDir) || !newPath.startsWith(resolvedStorageDir)) {
            return json({ error: 'Invalid path' }, { status: 400 });
        }

        const availableNewName = await GetAvailableName(path.resolve(STORAGE_DIR, currentPath), sanitizedNewName);
        const finalNewPath = path.resolve(STORAGE_DIR, currentPath, availableNewName);

        const exists = await fs
            .access(oldPath)
            .then(() => true)
            .catch(() => false);

        if (!exists) {
            return json({ error: 'File or directory not found' }, { status: 404 });
        }

        await fs.rename(oldPath, finalNewPath);

        return json({ success: true, newName: availableNewName });
    } catch (err) {
        console.error('Error renaming:', err);
        return json({ error: 'Failed to rename' }, { status: 500 });
    }
}