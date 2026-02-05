const express = require('express');
const multer  = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// replicate API Key
const replicateApiKey = '4f9aa712-b7a9-4359-96e6-5aa35244b134:d84e0e84c292c22019e981bd10342823';
console.log("Replicate API Key Loaded (partial):", replicateApiKey.substring(0, 10) + "...");
const replicateModelId = 'stability-ai/stable-diffusion:db21e94d56c235a21f793be9e26e5625122c935a92565dca3f2aedba80c35b63'; // Replace with the actual model ID
console.log("Replicate Model ID:", replicateModelId);


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No files were uploaded.');
  }

  const imageUrl = `http://127.0.0.1:${port}/uploads/${req.file.filename}`;
  console.log("Image URL:", imageUrl);

  try {
    console.log("Sending image to Replicate. Image URL:", imageUrl);
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