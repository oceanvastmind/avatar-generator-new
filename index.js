const express = require('express');
const multer  = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const AWS = require('aws-sdk'); // Import AWS SDK

const app = express();
const port = process.env.PORT || 3000;

// AWS S3 Configuration - Hardcoded for now, ideally from env variables on Vercel
const AWS_REGION = 'us-east-1';
const S3_BUCKET_NAME = 'ocean-s3-bucket1';

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});
const s3 = new AWS.S3();

// Replicate API Key
const replicateApiKey = '4f9aa712-b7a9-4359-96e6-5aa35244b134:d84e0e84c292c22019e981bd10342823';
console.log("Replicate API Key Loaded (partial):", replicateApiKey.substring(0, 10) + "...");
const replicateModelId = 'stability-ai/stable-diffusion:db21e94d56c235a21f793be9e26e5625122c935a92565dca3f2aedba80c35b63'; // Replace with the actual model ID
console.log("Replicate Model ID:", replicateModelId);

// Configure multer for temporary local file storage before S3 upload
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
// Removed app.use('/uploads', express.static('uploads')); as images are now on S3

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  const fileContent = fs.readFileSync(req.file.path);
  const s3Key = `avatars/${Date.now()}-${req.file.originalname}`;

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: req.file.mimetype,
    ACL: 'public-read' // Make the uploaded image publicly accessible
  };

  let imageUrl; // This will be the S3 URL

  try {
    const s3UploadResult = await s3.upload(params).promise();
    imageUrl = s3UploadResult.Location; // This is the public URL from S3

    console.log("Image uploaded to S3. URL:", imageUrl);

    // Clean up local file after upload
    fs.unlinkSync(req.file.path);

  } catch (s3Error) {
    console.error("Error uploading to S3:", s3Error);
    // Clean up local file even on S3 upload error
    fs.unlinkSync(req.file.path);
    return res.status(500).send('Error uploading image to cloud storage: ' + s3Error.message);
  }

  console.log("Sending image to Replicate. Image URL:", imageUrl);

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.replicate.com/v1/predictions`,
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        version: replicateModelId,
        input: {
          prompt: imageUrl
        }
      }
    });
    console.log("Replicate API Response:", response.data);

    const avatarUrl = response.data.output[0]; // Adjust based on the actual API response
    console.log("Avatar URL:", avatarUrl);
    res.send('File uploaded successfully! Avatar URL: ' + avatarUrl);

  } catch (error) {
    console.error("Error generating avatar:", error);
    res.status(500).send('Error generating avatar: ' + error.message);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});