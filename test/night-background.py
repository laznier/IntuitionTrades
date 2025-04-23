import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# Set tall mobile-friendly dimensions (portrait)
width, height = 1920, 1080

# Create vertical gradient
gradient = np.linspace(0, 1, height).reshape(-1, 1)
gradient = np.repeat(gradient, width, axis=1)

# Dark night sky to ocean transition
colors = ['#000010', '#0b1e3c', '#0f2c5c', '#1a446e', '#216d8a']
cmap = LinearSegmentedColormap.from_list("night_space_to_ocean", colors)

# Plot and save
plt.figure(figsize=(width / 100, height / 100), dpi=100)
plt.imshow(gradient, aspect='auto', cmap=cmap)
plt.axis('off')
plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
plt.savefig("night_space_to_ocean_gradient.png", bbox_inches='tight', pad_inches=0)
plt.close()

print("✅ Saved: night_space_to_ocean_gradient.png")
