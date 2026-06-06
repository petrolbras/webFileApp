<script lang="ts">
    import type { PageData } from './$types';
    import { invalidateAll } from '$app/navigation';
    import { push } from '$lib/components/toast.svelte';
    import { faFile, faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
    import Fa from 'svelte-fa';

    let { data }: { data: PageData } = $props();

    let creatingFolder = $state(false);
    let newFolderName = $state('');
    let creatingFile = $state(false);
    let newFileName = $state('');
    let showMenu = $state(false);

    let openedMenuPath = $state<string | null>(null);
    let renamingPath = $state<string | null>(null);
    let renamingValue = $state('');

    $effect(() => {
        data.currentPath;

        creatingFolder = false;
        newFolderName = '';
    });

    $effect(() => {
        data.currentPath;

        renamingPath = null;
        renamingValue = '';
    });

    let files = $derived.by(() => [...data.files]);

    const segments = $derived.by(() =>
        data.currentPath ? data.currentPath.split('/') : []
    );

    const parentPath = $derived.by(() => {

        if (!data.currentPath) {
            return '';
        }

        return data.currentPath
            .split('/')
            .slice(0, -1)
            .join('/');

    });

    let fileInput: HTMLInputElement;
    let folderInput: HTMLInputElement;
    interface FileItem {
        name: string;
        type: 'file' | 'folder';
        size: string;
        mime: string | null;
        path: string;
    }

    function autofocus(node: HTMLInputElement) {
        node.focus();
    }

    function startRename(file: FileItem) {
        renamingPath = file.path;
        renamingValue = file.name;
    }

    async function handleDownload(file: FileItem) {
        try {
            const res = await fetch(`/api/download?path=${encodeURIComponent(file.path)}`);

            if (!res.ok) {
                const result = await res.json();
                throw new Error(result.error);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
            push(err instanceof Error ? err.message : "Failed to download.", { duration: 3000 });
        }
    }

    async function deleteFile(file: FileItem) {

        if (file.type === 'folder') {
            if (!confirm(`Are you sure you want to delete the folder "${file.path}" and all its contents?`)) {
                return;
            }
        } else {
            if (!confirm(`Are you sure you want to delete the file "${file.path}"?`)) {
                return;
            }
        }

        try {
            const res = await fetch('/api/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ path: file.path })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error);
            }

            files = files.filter(f => f.path !== file.path);

            push(`Deleted successfully.`, { duration: 3000 });
        } catch (err) {
            console.error("Delete error:", err);
            push(err instanceof Error ? err.message : "Failed to delete.", { duration: 3000 });
        }
    }

    async function handleUpload(event: Event) { 
        const input = event.target as HTMLInputElement;

        const files = Array.from(input.files || []);

        if (!files.length) {
            return;
        }

        const formData = new FormData();
        formData.append('currentPath', data.currentPath);

        for (const file of files) {
            formData.append('files', file);
            formData.append('paths', file.webkitRelativePath || file.name);
        }

        try {
            const res = await fetch('/api/uploads', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error);
            }

            await invalidateAll();

            push('Upload completed.', { duration: 3000 });
        } catch (err) {
            console.error("Upload error:", err);
            push(err instanceof Error ? err.message : "Upload failed.", { duration: 3000 });
        }
    }

    async function createFolder() {

        if (!newFolderName.trim()) {
            return;
        }

        if (newFolderName.includes('/')) {
            push("Folder name cannot contain '/'.", { duration: 3000 });
            return;
        }

        try {
            const res = await fetch('/api/create-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newFolderName,
                    currentPath: data.currentPath
                })
            });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error);
        }

        newFolderName = '';

        creatingFolder = false;

        await invalidateAll();

        push('Folder created successfully.', { duration: 3000 });

        } catch (err) {
            console.error("Create folder error:", err);
            push(err instanceof Error ? err.message : "Failed to create folder.", { duration: 3000 });
        }
    }

    async function createFile() {

        if (!newFileName.trim()) {
            return;
        }

        if (newFileName.includes('/')) {
            push("File name cannot contain '/'.", { duration: 3000 });
            return;
        }

        try {
            const res = await fetch('/api/create-file', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newFileName,
                    currentPath: data.currentPath
                })
            });

        const result = await res.json();

        if (!res.ok) {
            throw new Error(result.error);
        }

        newFileName = '';

        creatingFile = false;

        await invalidateAll();

        push('File created successfully.', { duration: 3000 });

        } catch (err) {
            console.error("Create file error:", err);
            push(err instanceof Error ? err.message : "Failed to create file.", { duration: 3000 });
        }
    }

    async function renameFile(file: FileItem) {
        if (!renamingValue.trim()) {
            return;
        }

        if (renamingValue === file.name) {
            push("Name cannot be the same as the current name.", { duration: 3000 });
            return;
        }

        if (renamingValue.includes('/')) {
            push("Name cannot contain '/'.", { duration: 3000 });
            return;
        }

        try {
            const res = await fetch('/api/rename', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPath: data.currentPath,
                    oldName: file.name,
                    newName: renamingValue
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error);
            }

            renamingPath = null;
            renamingValue = '';

            await invalidateAll();

            push('Renamed successfully.', { duration: 3000 });
        } catch (err) {
            console.error("Rename error:", err);
            push(err instanceof Error ? err.message : "Failed to rename.", { duration: 3000 });
        }
    }

</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">

    <div class="w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl p-8">

        <div class="mb-8">

            <div class="flex items-center">

                <h1 class="text-5xl font-bold tracking-tight mb-3">Explorer</h1>

                <input
                    bind:this={fileInput}
                    type="file"
                    multiple
                    class="hidden"
                    onchange={handleUpload}
                />

                <input
                    bind:this={folderInput}
                    type="file"
                    multiple
                    webkitdirectory
                    class="hidden"
                    onchange={handleUpload}
                />

                <div class="relative ml-auto flex flex-col items-center gap-2">
 
                    <div class="relative ml-auto flex items-end gap-2">

                        <button
                            class="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 border border-zinc-600 cursor-pointer text-red"
                            aria-label="Create file"
                            title="Create file"
                            onclick={() => creatingFile = !creatingFile}
                        >
                            <Fa icon={faFile}></Fa>
                        </button>

                        <div class="flex flex-col items-center gap-2">

                            <button
                                class="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 border border-zinc-600 cursor-pointer"
                                onclick={() => showMenu = !showMenu}
                            >
                                <Fa icon={faPlus}></Fa>
                            </button>

                            <button
                                class="w-10 h-10 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 border border-zinc-600 cursor-pointer"
                                aria-label="Create folder"
                                title="Create folder"
                                onclick={() => creatingFolder = !creatingFolder}
                            >
                                <Fa icon={faFolderOpen}></Fa>
                            </button>

                        </div>

                    </div>

                    {#if showMenu}

                        <div class="absolute top-0 right-full mr-3 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg py-2 min-w-48 z-50">

                            <button
                                class="w-full text-left px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                onclick={() => {
                                    fileInput.click();
                                    showMenu = false;
                                }}
                            >
                                Upload Files
                            </button>

                            <button
                                class="w-full text-left px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                onclick={() => {
                                    folderInput.click();
                                    showMenu = false;
                                }}
                            >
                                Upload Folder
                            </button>

                        </div>

                    {/if}

                </div>

            </div>

            <nav class="flex flex-wrap items-center text-lg text-zinc-400 gap-1">

                <a href="/explorer" class="hover:text-blue-400 transition-colors">
                    Home
                </a>

                {#each segments as segment, index}

                    {@const partialPath = segments.slice(0, index + 1).join('/')}

                    <span class="text-zinc-600">/</span>

                    <a
                        href={`/explorer/${partialPath}`}
                        class="hover:text-blue-400 transition-colors"
                    >
                        {segment}
                    </a>

                {/each}

            </nav>

        </div>

        {#if data.error}

            <div class="rounded-xl bg-red-950 border border-red-800 p-4 text-red-300">
                {data.error}
            </div>

        {:else}

            <div class="rounded-xl border border-zinc-800">

                <ul class="divide-y divide-zinc-800">

                    {#if data.currentPath === ''}

                        <div class="flex items-center gap-3 px-5 py-4 text-zinc-400">
                            <span>This is the root folder.</span>
                        </div>

                    {:else}

                        <li>

                            <a
                                href={parentPath ? `/explorer/${parentPath}` : '/explorer'}
                                class="flex items-center gap-3 px-5 py-4 hover:bg-zinc-800 transition-colors text-zinc-300"
                            >

                                <span class="text-xl">◀</span>

                                <span class="mt-1">Back</span>

                            </a>

                        </li>

                    {/if}

                    {#if creatingFolder}

                        <li class="px-5 py-4">

                            <div class="flex items-center gap-4">

                                <span class="text-3xl">📁</span>

                                <input
                                    use:autofocus
                                    bind:value={newFolderName}
                                    onkeydown={(event) => {
                                        if (event.key === 'Enter') {
                                            createFolder();
                                        } else if (event.key === 'Escape') {
                                            creatingFolder = false;
                                        }
                                    }}
                                    class="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 outline-none"
                                    placeholder="Folder name"
                                />

                            </div>

                        </li>

                    {/if}
                    
                    {#if creatingFile}

                        <li class="px-5 py-4">

                            <div class="flex items-center gap-4">

                                <span class="text-3xl">📄</span>

                                <input
                                    use:autofocus
                                    bind:value={newFileName}
                                    onkeydown={(event) => {
                                        if (event.key === 'Enter') {
                                            createFile();
                                        } else if (event.key === 'Escape') {
                                            creatingFile = false;
                                        }
                                    }}
                                    class="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 outline-none"
                                    placeholder="File name"
                                />

                            </div>

                        </li>

                    {/if}

                    {#if data.files.length === 0}

                        <div class="rounded-xl overflow-hidden">
                            
                            <div class="p-6 text-zinc-400 bg-zinc-950">
                                Empty folder.
                            </div>

                        </div>

                    {/if}

                    {#each files as file}

                        <li>

                            <div class="relative flex items-center gap-4 px-5 py-4 hover:bg-zinc-800 transition-colors">

                                <span class="text-3xl shrink-0">
                                    {file.type === 'folder' ? '📁' : '📄'}
                                </span>

                                <div class="flex flex-col min-w-0 flex-1">

                                    {#if renamingPath === file.path}

                                        <input
                                            bind:value={renamingValue}
                                            class="bg-zinc-800 border border-zinc-600 rounded px-3 py-2 outline-none text-zinc-100"
                                            onkeydown={(event) => {

                                                if (event.key === 'Enter') {
                                                    renameFile(file);
                                                }

                                                if (event.key === 'Escape') {
                                                    renamingPath = null;
                                                }

                                            }}
                                        />

                                    {:else}

                                        {#if file.type === 'folder'}

                                            <a
                                                href={
                                                    data.currentPath
                                                        ? `/explorer/${data.currentPath}/${file.name}`
                                                        : `/explorer/${file.name}`
                                                }
                                                class="text-xl text-zinc-100 break-all hover:text-blue-400"
                                            >
                                                {file.name}
                                            </a>

                                        {:else}

                                            <span class="text-xl text-zinc-100 break-all">
                                                {file.name}
                                            </span>

                                        {/if}

                                    {/if}

                                    <div class="flex items-center gap-2 text-sm text-zinc-500">

                                        <span>{file.size}</span>

                                        {#if file.type === 'file'}
                                            <span>.{file.mime}</span>
                                        {/if}

                                    </div>

                                </div>

                                <div class="relative">

                                    <button
                                        type="button"
                                        class="bg-zinc-800 px-3 py-2 rounded-lg hover:bg-zinc-700 border border-zinc-600 cursor-pointer"
                                        onclick={() => {
                                            openedMenuPath =
                                                openedMenuPath === file.path
                                                    ? null
                                                    : file.path;
                                        }}
                                    >
                                        ...
                                    </button>

                                    {#if openedMenuPath === file.path}

                                        <div
                                            class="absolute right-0 top-full mt-2 min-w-32 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg overflow-hidden z-50"
                                        >

                                            <button
                                                class="w-full text-left px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                                onclick={(event) => {
                                                    event.stopPropagation();

                                                    startRename(file);

                                                    openedMenuPath = null;
                                                }}
                                            >
                                                Rename
                                            </button>

                                            <button
                                                class="w-full text-left px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                                onclick={(event) => {
                                                    event.stopPropagation();

                                                    deleteFile(file);

                                                    openedMenuPath = null;
                                                }}
                                            >
                                                Delete
                                            </button>

                                            <button
                                                class="w-full text-left px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                                                onclick={(event) => {
                                                    event.stopPropagation();

                                                    handleDownload(file);

                                                    openedMenuPath = null;
                                                }}
                                            >
                                                Download
                                            </button>

                                        </div>

                                    {/if}

                                </div>

                            </div>

                        </li>

                    {/each}

                </ul>

            </div>

        {/if}

    </div>

</div>