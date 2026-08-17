import os
import shutil
import subprocess
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

def generate_icns(icon_512_path, target_icns_path):
    if shutil.which('iconutil') and shutil.which('sips'):
        iconset_dir = target_icns_path + '.iconset'
        os.makedirs(iconset_dir, exist_ok=True)
        try:
            img = Image.open(icon_512_path)
            sizes = [16, 32, 64, 128, 256, 512]
            for s in sizes:
                img_s = img.resize((s, s), Image.Resampling.LANCZOS)
                img_s.save(os.path.join(iconset_dir, f'icon_{s}x{s}.png'))
                img_2x = img.resize((s * 2, s * 2), Image.Resampling.LANCZOS)
                img_2x.save(os.path.join(iconset_dir, f'icon_{s}x{s}@2x.png'))
            
            subprocess.run(['iconutil', '-c', 'icns', iconset_dir, '-o', target_icns_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            shutil.rmtree(iconset_dir, ignore_errors=True)
            print(f"Generated: {os.path.basename(target_icns_path)} (Retina ICNS via iconutil)")
            return
        except Exception:
            shutil.rmtree(iconset_dir, ignore_errors=True)

    try:
        img = Image.open(icon_512_path)
        img.save(target_icns_path, format="ICNS")
        print(f"Generated: {os.path.basename(target_icns_path)} (via Pillow)")
    except Exception as e:
        print(f"Warning: Could not save ICNS: {e}")

def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    
    # Generate 512, 192, 180, 64, 32
    icon_512_path = os.path.join(ICONS_DIR, "icon-512.png")
    icon_512 = draw_icon(512)
    icon_512.save(icon_512_path, "PNG")
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

    # AppIcon.icns
    icns_path = os.path.join(ICONS_DIR, "AppIcon.icns")
    generate_icns(icon_512_path, icns_path)

if __name__ == '__main__':
    main()
