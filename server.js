const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

const uploadDir = '/tmp/uploads';

// Check if the upload directory exists, create it if it doesn't
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const notesDir = '/tmp/notes';

// Check if the notes directory exists, create it if it doesn't
if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
}

// Set up multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/uploads');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Google Drive setup
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString()),
    scopes: ['https://www.googleapis.com/auth/drive']
});
const drive = google.drive({ version: 'v3', auth });

app.post('/upload', upload.fields([{ name: 'pdfRxForm', maxCount: 1 }, { name: 'stlFile', maxCount: 1 }]), async (req, res) => {
    try {
        const { name, email, note } = req.body;
        if (!name || !email) {
            return res.status(400).send('Name and Email are required.');
        }
        
        // Format date
        const date = new Date();
        const formattedDate = `${date.getMonth() + 1}-${date.getDate()}-${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')-12}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        
        // Create a new folder in Google Drive
        const folderMetadata = {
            'name': `${name}-${email}-${formattedDate}`,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [process.env.GOOGLE_DRIVE_FOLDER_ID]
        };
        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });
        const folderId = folder.data.id;

        // Upload files to Google Drive
        const uploadFile = async (file, mimeType) => {
            if (file) {
                const filePath = file.path;
                const fileName = file.originalname;
                const fileMetadata = {
                    'name': fileName,
                    'parents': [folderId]
                };
                const media = {
                    mimeType: mimeType,
                    body: fs.createReadStream(filePath)
                };
                await drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id'
                });
                // Remove file from local storage after upload
                fs.unlinkSync(filePath);
            }
        };

        await uploadFile(req.files['pdfRxForm'] ? req.files['pdfRxForm'][0] : null, 'application/pdf');
        await uploadFile(req.files['stlFile'] ? req.files['stlFile'][0] : null, 'model/stl');
        
        // Handle note
        if (note) {
            const noteFileName = `Note-${name}-${formattedDate}.txt`;
            const noteFilePath = path.join('/tmp/notes', noteFileName);
            fs.writeFileSync(noteFilePath, note);
            await uploadFile({ path: noteFilePath, originalname: noteFileName }, 'text/plain');
        }

        res.json({ success: true, message: 'Files and note uploaded successfully', folderId: folderId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Failed to upload files to Google Drive' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
