import os
from PIL import Image, ImageDraw

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ICONS_DIR = os.path.join(ROOT_DIR, 'public', 'icons')

def draw_icon(size):
    # Create RGBA image with indigo gradient background and rounded corners
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background rounded rectangle
    margin = int(size * 0.04)
    radius = int(size * 0.22)
    
    # Draw dark indigo background
    draw.rounded_rectangle(
        [(margin, margin), (size - margin, size - margin)],
        radius=radius,
        fill=(79, 70, 229, 255), # Indigo 600
        outline=(99, 102, 241, 255), # Indigo 500
        width=max(1, int(size * 0.02))
    )

    # Draw inner badge / book symbol
    cx, cy = size // 2, size // 2
    
    # Book styling
    bw = int(size * 0.52)
    bh = int(size * 0.36)
    bx = (size - bw) // 2
    by = (size - bh) // 2 - int(size * 0.04)

    # Left page
    draw.polygon([
        (cx - 2, by + int(bh * 0.85)),
        (bx, by + int(bh * 0.7)),
        (bx, by),
        (cx - 2, by + int(bh * 0.15))
    ], fill=(255, 255, 255, 245))

    # Right page
    draw.polygon([
        (cx + 2, by + int(bh * 0.85)),
        (bx + bw, by + int(bh * 0.7)),
        (bx + bw, by),
        (cx + 2, by + int(bh * 0.15))
    ], fill=(241, 245, 249, 245))

    # Center spine
    draw.rectangle([
        (cx - 2, by + int(bh * 0.15)),
        (cx + 2, by + int(bh * 0.88))
    ], fill=(199, 210, 254, 255))

    # Amber yellow accent bar
    bar_y = by + bh + int(size * 0.08)
    draw.rounded_rectangle([
        (cx - int(size * 0.28), bar_y),
        (cx + int(size * 0.28), bar_y + int(size * 0.08))
    ], radius=max(1, int(size * 0.04)), fill=(254, 240, 138, 255))

    return img

def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    
    # Generate 512, 192, 180, 64, 32
    icon_512 = draw_icon(512)
    icon_512.save(os.path.join(ICONS_DIR, "icon-512.png"), "PNG")
    print("Generated: icon-512.png")

    icon_192 = draw_icon(192)
    icon_192.save(os.path.join(ICONS_DIR, "icon-192.png"), "PNG")
    print("Generated: icon-192.png")

    icon_180 = draw_icon(180)
    icon_180.save(os.path.join(ICONS_DIR, "apple-touch-icon.png"), "PNG")
    print("Generated: apple-touch-icon.png")

    icon_64 = draw_icon(64)
    icon_64.save(os.path.join(ICONS_DIR, "favicon.png"), "PNG")
    print("Generated: favicon.png")

    icon_32 = draw_icon(32)
    icon_32.save(os.path.join(ICONS_DIR, "favicon.ico"), format="ICO")
    print("Generated: favicon.ico")

if __name__ == '__main__':
    main()
