from PIL import Image

width = 100
height = 100
img = Image.new('RGB', (width, height), color = 'red')
img.save('test_image.png')