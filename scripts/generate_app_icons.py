import os
from PIL import Image, ImageDraw, ImageFont

def create_app_icons():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    public_dir = os.path.join(root, 'public')
    os.makedirs(public_dir, exist_ok=True)

    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Gradient rounded rectangle (iOS/macOS modern squircle look)
    # Background: Indigo #4f46e5 to Purple #7c3aed to Deep Slate #0f172a
    margin = 24
    radius = 110
    
    # Draw background squircle
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(79, 70, 229, 255) # Indigo 600
    )

    # Subtle inner gradient overlay
    for i in range(margin, size - margin):
        alpha = int(140 * ((i - margin) / (size - 2 * margin)))
        # blend towards purple/slate
        draw.line([(margin, i), (size - margin, i)], fill=(124, 58, 237, alpha))

    # Inner border glow
    draw.rounded_rectangle(
        [margin + 4, margin + 4, size - margin - 4, size - margin - 4],
        radius=radius - 4,
        outline=(255, 255, 255, 60),
        width=4
    )

    # 2. Icon graphics: Book/Graduation cap badge + "考研" + "EN"
    # Draw a stylized book or gold badge in center
    # Top badge: "考研"
    # Try system fonts or default
    font_large = None
    font_small = None
    
    # Common Windows/Mac font paths
    font_candidates = [
        "C:\\Windows\\Fonts\\msyh.ttc",
        "C:\\Windows\\Fonts\\msyhbd.ttc",
        "C:\\Windows\\Fonts\\simhei.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/Library/Fonts/Arial Unicode.ttf"
    ]
    for font_path in font_candidates:
        if os.path.exists(font_path):
            try:
                font_large = ImageFont.truetype(font_path, 160)
                font_small = ImageFont.truetype(font_path, 60)
                break
            except Exception:
                pass

    if font_large is None:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw Text "研" or "考研"
    text1 = "考研"
    text2 = "ENGLISH"

    # Draw Golden Accent Bar
    draw.rounded_rectangle(
        [150, 100, 362, 116],
        radius=8,
        fill=(251, 191, 36, 240) # Amber 400
    )

    # Center Text
    bbox1 = draw.textbbox((0, 0), text1, font=font_large)
    w1 = bbox1[2] - bbox1[0]
    h1 = bbox1[3] - bbox1[1]
    draw.text(((size - w1) / 2, 140), text1, font=font_large, fill=(255, 255, 255, 255))

    # English badge
    draw.rounded_rectangle(
        [130, 350, 382, 410],
        radius=20,
        fill=(30, 27, 75, 220), # Deep Indigo
        outline=(251, 191, 36, 180),
        width=3
    )

    bbox2 = draw.textbbox((0, 0), text2, font=font_small)
    w2 = bbox2[2] - bbox2[0]
    draw.text(((size - w2) / 2, 355), text2, font=font_small, fill=(251, 191, 36, 255))

    # Save icon-512.png
    p512 = os.path.join(public_dir, 'icon-512.png')
    img.save(p512, "PNG")

    # Resize and save icon-192.png
    img192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    p192 = os.path.join(public_dir, 'icon-192.png')
    img192.save(p192, "PNG")

    # Resize and save favicon.png (64x64)
    img64 = img.resize((64, 64), Image.Resampling.LANCZOS)
    p64 = os.path.join(public_dir, 'favicon.png')
    img64.save(p64, "PNG")

    # Save apple-touch-icon.png (180x180)
    img180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    p180 = os.path.join(public_dir, 'apple-touch-icon.png')
    img180.save(p180, "PNG")

    print(f"Generated 512, 192, 180, 64 icons in {public_dir}")

if __name__ == '__main__':
    create_app_icons()
