const express = require('express');
const multer  = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Import GoogleGenerativeAI SDK
const fs = require('fs');
const AWS = require('aws-sdk'); // Import AWS SDK

const app = express();
const port = process.env.PORT || 3000;

// AWS S3 Configuration - Using environment variables
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});
const s3 = new AWS.S3();

// Gemini API Configuration
const geminiApiKey = process.env.GOOGLE_API_KEY; // Using environment variable
console.log("Gemini API Key Loaded (partial):", geminiApiKey ? geminiApiKey.substring(0, 10) + "..." : "Not set");
const generativeModelName = "gemini-pro-vision"; // Using the specified model
const genAI = new GoogleGenerativeAI(geminiApiKey);
const generativeModel = genAI.getGenerativeModel({ model: generativeModelName });

// Configure multer to use memory storage, suitable for serverless environments
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
// Removed app.use('/uploads', express.static('uploads')); as images are now on S3

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('avatar'), async (req, res) => {
  console.log("Received req.file:", req.file);
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  const fileContent = req.file.buffer;
  const s3Key = `avatars/${Date.now()}-${req.file.originalname}`;

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: req.file.mimetype
  };

  let imageUrl; // This will be the S3 URL

  console.log("Attempting S3 upload...");
  try {
    const s3UploadResult = await s3.upload(params).promise();
    imageUrl = s3UploadResult.Location; // This is the public URL from S3

    console.log("Image uploaded to S3. URL:", imageUrl);

    // No local file cleanup needed as multer uses memory storage

  } catch (s3Error) {
    console.error("Error uploading to S3:", s3Error);
    return res.status(500).send('Error uploading image to cloud storage: ' + s3Error.message);
  }

  console.log("Sending image to Gemini. Image URL:", imageUrl);

  try {
    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype,
      },
    };

    const prompt = "Generate a cool avatar from this image in a Pokémon trainer style. Describe the avatar as a URL if possible.";

    const result = await generativeModel.generateContent([
      prompt,
      imagePart,
    ]);
    const response = await result.response;
    const text = response.text();

    // For now, let's assume the Gemini response text contains the avatar URL or can be directly used
    const avatarUrl = text; 

    console.log("Gemini API Response:", text);
    console.log("Avatar URL:", avatarUrl);
    res.send('File uploaded successfully! Avatar URL: ' + avatarUrl);

  } catch (error) {
    console.error("Error generating avatar with Gemini:", error);
    res.status(500).send('Error generating avatar: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});