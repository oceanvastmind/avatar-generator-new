const fs = require('fs');

// Minimal 1x1 red PNG image data (base64 encoded)
// This is a very small, valid PNG file.
const redPixelPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADvgGFAoQoIgAAAABJRU5ErkJggg==';

const buffer = Buffer.from(redPixelPngBase64, 'base64');

fs.writeFileSync('test_image.png', buffer);
console.log('Generated test_image.png');