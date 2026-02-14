// ================================================
// Hugging Face API Integration — Eduvance LMS
// ================================================

const HuggingFaceAPI = {

    BASE_URL: 'https://huggingface.co',

    // ---- Get stored HF token from Firebase ----
    async getToken() {
        const settings = await FirestoreDB.getSettings('huggingface');
        return settings?.token || null;
    },

    // ---- Validate token by fetching user info ----
    async validateToken(token) {
        try {
            const res = await fetch(`${this.BASE_URL}/api/whoami-v2`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return { valid: false, error: 'Invalid token' };
            const data = await res.json();
            return { valid: true, username: data.name, fullName: data.fullname || data.name };
        } catch (e) {
            return { valid: false, error: e.message };
        }
    },

    // ---- List all datasets for the authenticated user ----
    async listDatasets(token) {
        try {
            // First get username
            const whoami = await this.validateToken(token);
            if (!whoami.valid) throw new Error('Invalid token');

            const res = await fetch(`${this.BASE_URL}/api/datasets?author=${whoami.username}&limit=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Failed to list datasets: ${res.status}`);
            const datasets = await res.json();
            return datasets.map(d => ({
                id: d.id,
                name: d.id.split('/').pop(),
                private: d.private,
                lastModified: d.lastModified
            }));
        } catch (e) {
            console.error('List datasets error:', e);
            throw e;
        }
    },

    // ---- List files/folders in a dataset path ----
    async listTree(token, repoId, path = '') {
        try {
            const encodedPath = path ? '/' + encodeURIComponent(path) : '';
            const url = `${this.BASE_URL}/api/datasets/${repoId}/tree/main${encodedPath}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`Failed to list tree: ${res.status}`);
            let items = await res.json();

            // Sort items naturally (01 comes before 02, 2 comes before 10)
            items.sort((a, b) => {
                return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
            });

            return items.map(item => ({
                type: item.type, // 'file' or 'directory'
                path: item.path,
                name: item.path.split('/').pop(),
                size: item.size || 0,
                lfs: item.lfs || null
            }));
        } catch (e) {
            console.error('List tree error:', e);
            throw e;
        }
    },

    // ---- Generate resolve URL for a file ----
    resolveURL(repoId, filePath, token) {
        const encoded = filePath.split('/').map(p => encodeURIComponent(p)).join('/');
        let url = `${this.BASE_URL}/datasets/${repoId}/resolve/main/${encoded}`;
        if (token) url += `?token=${token}`;
        return url;
    },

    // ---- Parse filename: strip number prefix ----
    // "01. Introduction to Cross-Platform..." → "Introduction to Cross-Platform..."
    // "3. What is Flutter.mp4" → "What is Flutter"
    parseFileName(name, stripExtension = false) {
        let parsed = name;
        // Strip number prefix like "01. " or "3. " or "03. " or "1 - "
        parsed = parsed.replace(/^\d+[\.\)\-\s]+\s*/, '');
        // Strip file extension if requested
        if (stripExtension) {
            parsed = parsed.replace(/\.[^.]+$/, '');
        }
        return parsed.trim() || name;
    },

    // ---- Detect content type from filename ----
    detectFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const videoExts = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v'];
        const subtitleExts = ['vtt', 'srt', 'ass', 'ssa'];
        const pdfExts = ['pdf'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

        if (videoExts.includes(ext)) return 'video';
        if (subtitleExts.includes(ext)) return 'subtitle';
        if (pdfExts.includes(ext)) return 'pdf';
        if (imageExts.includes(ext)) return 'image';
        return 'file';
    },

    // ---- Auto-match subtitles with videos ----
    // Files with same number prefix: "3. What is Flutter.mp4" + "3. What is Flutter.vtt"
    matchSubtitles(files) {
        // This function is now a helper for processFolder, not the main processor
        const subtitles = files.filter(f => this.detectFileType(f.name) === 'subtitle');
        return subtitles;
    },

    // ---- Process a folder for import ----
    // Returns structured data ready for Firestore import
    async processFolder(token, repoId, folderPath) {
        const items = await this.listTree(token, repoId, folderPath);

        // Filter and sort files naturally
        const files = items.filter(i => i.type === 'file').sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        const subtitles = files.filter(f => this.detectFileType(f.name) === 'subtitle');
        const processedItems = [];
        const consumedSubtitles = new Set(); // Keep track of matched subtitles

        for (const file of files) {
            const type = this.detectFileType(file.name);

            // Skip if this file is a subtitle we've already matched to a video
            if (consumedSubtitles.has(file.name)) continue;

            if (type === 'video') {
                // Find matching subtitle
                const videoPrefix = file.name.match(/^(\d+)/)?.[1];
                const videoBaseName = file.name.replace(/\.[^.]+$/, '');

                let matchedSub = null;

                // 1. Try match by exact base name (video.mp4 -> video.vtt)
                matchedSub = subtitles.find(sub => !consumedSubtitles.has(sub.name) && sub.name.replace(/\.[^.]+$/, '') === videoBaseName);

                // 2. Try match by number prefix (01.video.mp4 -> 01.subtitle.vtt)
                if (!matchedSub && videoPrefix) {
                    matchedSub = subtitles.find(sub => !consumedSubtitles.has(sub.name) && sub.name.match(/^(\d+)/)?.[1] === videoPrefix);
                }

                if (matchedSub) {
                    consumedSubtitles.add(matchedSub.name);
                }

                processedItems.push({
                    name: this.parseFileName(file.name, true),
                    type: 'video',
                    url: this.resolveURL(repoId, file.path, null),
                    subtitleUrl: matchedSub ? this.resolveURL(repoId, matchedSub.path, null) : '',
                    originalName: file.name,
                    size: file.size,
                    order: processedItems.length,
                    selected: true
                });

            } else if (type === 'subtitle') {
                // It's a subtitle, but check if we should show it (orphan) or if it's waiting to be matched
                // If we are iterating in order, and we encounter a subtitle that hasn't been consumed yet...
                // It might belong to a lATER video? Unlikely if sorted by name.
                // Or it might be an orphan.
                // NOTE: If file sorting works (1.mp4, 1.vtt), we might see mp4 then vtt.
                // If we see vtt first (e.g. alphabetical 'a.vtt' before 'b.mp4'), we shouldn't consume it yet if it belongs to b?
                // Actually, usually video and subtitle share name.

                // If it's a subtitle and NOT consumed yet, we'll strip it from the main list 
                // ONLY IF it looks like it *should* pair with a video. 
                // But for simplicity, we usually don't want standalone subtitles in the course list.
                // Let's Skip all subtitles from being added as standalone content items.
                continue;

            } else {
                // PDF, Image, etc.
                processedItems.push({
                    name: this.parseFileName(file.name, true),
                    type: type === 'image' ? 'file' : type, // map image to file or keep as image? Player handles 'file' better usually, but let's keep type
                    url: this.resolveURL(repoId, file.path, null),
                    subtitleUrl: '',
                    originalName: file.name,
                    size: file.size,
                    order: processedItems.length,
                    selected: true
                });
            }
        }

        return {
            folderName: this.parseFileName(folderPath.split('/').pop()),
            folderPath: folderPath,
            items: processedItems
        };
    }
};
