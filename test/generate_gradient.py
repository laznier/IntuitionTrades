import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# Ultra-tall image dimensions (4K vertical)
width, height = 1920, 1080

# Create vertical gradient data
gradient = np.linspace(0, 1, height).reshape(-1, 1)
gradient = np.repeat(gradient, width, axis=1)

# Define gradient colors from sky blue to golden
colors = ['#6a98ca', '#9cc2e5', '#dceff5', '#fbeedc', '#f8d7a4']
cmap = LinearSegmentedColormap.from_list("sunrise_sky_vertical_hd", colors)

# Plot the gradient and save it as PNG
plt.figure(figsize=(width / 100, height / 100), dpi=100)
plt.imshow(gradient, aspect='auto', cmap=cmap)
plt.axis('off')
plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
plt.savefig("ultra_tall_sky_gradient_4k.png", bbox_inches='tight', pad_inches=0)
plt.close()

print("✅ Image saved as ultra_tall_sky_gradient_4k.png")
