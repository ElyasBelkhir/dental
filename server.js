// server.js

const express = require('express');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const cors = require('cors'); // Import the cors package
const app = express();
require('dotenv').config();

app.use(express.json());
app.use(express.static('public'));

// Enable CORS for all routes (you can restrict origins if needed)
app.use(cors({
  origin: ['https://www.creationdentallab.com/', 'https://www.app.creationdentallab.com/'], // Replace with your actual Wix domain(s)
  methods: ['GET', 'POST'], // Specify the HTTP methods you want to allow
  credentials: true // Enable cookies and other credentials if needed
}));

// Initialize Google Cloud Storage client
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;

// Endpoint to generate signed URLs
app.post('/generate-signed-url', async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).send('Filename and contentType are required.');
    }

    const options = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    };

    const [url] = await storage
      .bucket(bucketName)
      .file(filename)
      .getSignedUrl(options);

    res.json({ url });
  } catch (err) {
    console.error('Error generating signed URL:', err);
    res.status(500).send('Error generating signed URL');
  }
});

// Endpoint to receive and save metadata
app.post('/submit-metadata', async (req, res) => {
  const { name, email, note, parentFolder, timestamp } = req.body;

  if (!name || !email || !parentFolder || !timestamp) {
    return res.status(400).send('Name, Email, parentFolder, and timestamp are required.');
  }

  // Log the metadata to the console
  console.log('Received metadata:', { name, email, note, parentFolder, timestamp });

  // Save metadata as a JSON file in GCS under the metadata folder
  try {
    const metadataFileName = `${parentFolder}/metadata/metadata.json`;
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(metadataFileName);

    const metadataContent = JSON.stringify({ name, email, note, timestamp });

    await file.save(metadataContent, {
      resumable: false,
      metadata: {
        contentType: 'application/json',
      },
    });

    console.log(`Metadata uploaded to ${metadataFileName} in bucket ${bucketName}`);
  } catch (error) {
    console.error('Error uploading metadata to GCS:', error);
    return res.status(500).send('Error uploading metadata to storage.');
  }

  // Send a success response back to the client
  res.status(200).json({ success: true, message: 'Metadata received successfully' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
