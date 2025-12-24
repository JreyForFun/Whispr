from PIL import Image

# Open the 192x192 image
img = Image.open(r'c:\whispr\public\pwa-192x192.png')

# Resize to 512x512 using high-quality resampling
img_resized = img.resize((512, 512), Image.Resampling.LANCZOS)

# Save as 512x512
img_resized.save(r'c:\whispr\public\pwa-512x512.png')

print("Successfully resized to 512x512")
