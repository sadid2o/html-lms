// ================================================
// Notes — Save per user per content in Firebase
// ================================================

const Notes = {
    // Get note for a specific content item
    async getNote(userId, courseId, contentId) {
        const snap = await db.collection('user_notes')
            .where('userId', '==', userId)
            .where('courseId', '==', courseId)
            .where('contentId', '==', contentId)
            .limit(1).get();
        if (snap.empty) return null;
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    },

    // Save or update note
    async saveNote(userId, courseId, sectionId, contentId, text) {
        const existing = await this.getNote(userId, courseId, contentId);
        if (existing) {
            await db.collection('user_notes').doc(existing.id).update({
                text: text,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection('user_notes').add({
                userId, courseId, sectionId, contentId,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    },

    // Get all notes for a course
    async getCourseNotes(userId, courseId) {
        const snap = await db.collection('user_notes')
            .where('userId', '==', userId)
            .where('courseId', '==', courseId).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Download all course notes as PDF
    async downloadAsPDF(userId, courseId, courseName) {
        const notes = await this.getCourseNotes(userId, courseId);
        if (notes.length === 0) {
            alert('No notes to download for this course.');
            return;
        }

        // Build printable HTML
        let html = `
        <html><head><title>Notes - ${courseName || 'Course'}</title>
        <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.8; }
        h1 { font-size: 22px; color: #6C5CE7; border-bottom: 2px solid #6C5CE7; padding-bottom: 8px; margin-bottom: 24px; }
        .note-item { margin-bottom: 24px; padding: 16px; background: #f8f8fc; border-left: 4px solid #6C5CE7; border-radius: 4px; }
        .note-item h3 { font-size: 14px; color: #555; margin-bottom: 8px; }
        .note-item p { white-space: pre-wrap; font-size: 14px; color: #333; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; }
        @media print { body { padding: 20px; } }
        </style></head><body>
        <h1>📝 Notes — ${courseName || 'Course'}</h1>`;

        notes.forEach((n, i) => {
            html += `<div class="note-item">
                <h3>Note ${i + 1}</h3>
                <p>${(n.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>`;
        });

        html += `<div class="footer">Generated from Eduvance LMS · ${new Date().toLocaleDateString()}</div>`;
        html += `</body></html>`;

        // Open in new window and print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }
};
