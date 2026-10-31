import zlib, struct

def make_png(size, path):
    bg, fg = (109, 74, 255), (255, 255, 255)
    c = size / 2
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            d = ((x - c) ** 2 + (y - c) ** 2) ** 0.5
            # Vòng tròn trắng ở giữa nền tím
            row += bytes(fg if size * 0.18 <= d < size * 0.30 else bg)
        rows.append(bytes(row))
    def chunk(t, data):
        return struct.pack(">I", len(data)) + t + data + struct.pack(">I", zlib.crc32(t + data) & 0xffffffff)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(b"".join(rows)))
    png += chunk(b"IEND", b"")
    open(path, "wb").write(png)

make_png(192, "icon-192.png")
make_png(512, "icon-512.png")
print("Xong")
