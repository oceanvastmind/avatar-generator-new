const express = require('express');
const multer  = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// fal.ai API Key
const falApiKey = fs.readFileSync('/Users/qunyingfan/.openclaw/workspace/fal_api_key.txt', 'utf8').trim();
const falModelId = 'face-to-cartoon-3d'; // Replace with the actual model ID

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

  const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.fal.ai/v1/model/${falModelId}/predict`,
      headers: {
        'Authorization': `Key ${falApiKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        input: {
          image_url: imageUrl
        }
      }
    });

    const avatarUrl = response.data.images[0].url; // Adjust based on the actual API response
    res.send('File uploaded successfully! Avatar URL: ' + avatarUrl);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating avatar');
  }

});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});