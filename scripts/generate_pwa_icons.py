import os
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')

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
        width=int(size * 0.02)
    )

    # Draw inner badge / book symbol
    cx, cy = size // 2, size // 2
    
    # Book / Graduation cap styling
    # Draw book pages
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

    # Draw letter "E" or "研" text or subtitle bar
    bar_y = by + bh + int(size * 0.08)
    draw.rounded_rectangle([
        (cx - int(size * 0.28), bar_y),
        (cx + int(size * 0.28), bar_y + int(size * 0.08))
    ], radius=int(size * 0.04), fill=(254, 240, 138, 255)) # Amber yellow accent

    return img

def main():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    for size in [192, 512]:
        icon = draw_icon(size)
        out_path = os.path.join(PUBLIC_DIR, f"icon-{size}.png")
        icon.save(out_path, "PNG")
        print(f"Generated: {out_path}")

    # Also save favicon
    icon_32 = draw_icon(32)
    icon_32.save(os.path.join(PUBLIC_DIR, "favicon.png"), "PNG")
    print("Generated favicon.png")

if __name__ == '__main__':
    main()
