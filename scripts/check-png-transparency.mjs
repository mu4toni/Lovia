import fs from 'fs';
import zlib from 'zlib';

function checkPngEdges(filePath) {
  const buf = fs.readFileSync(filePath);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  
  let pos = 8;
  const idats = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idats.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  
  const bytesPerPixel = 4;
  const rowStride = 1 + width * bytesPerPixel;
  
  const reconstructed = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = decompressed[y * rowStride];
    const srcRow = decompressed.slice(y * rowStride + 1, (y + 1) * rowStride);
    const prevRow = y > 0 ? reconstructed.slice((y - 1) * width * 4, y * width * 4) : null;
    const destRow = reconstructed.slice(y * width * 4, (y + 1) * width * 4);
    
    for (let x = 0; x < width * 4; x++) {
      const a = x >= 4 ? destRow[x - 4] : 0;
      const b = prevRow ? prevRow[x] : 0;
      const c = (x >= 4 && prevRow) ? prevRow[x - 4] : 0;
      const raw = srcRow[x];
      
      let val = 0;
      if (filter === 0) val = raw;
      else if (filter === 1) val = (raw + a) & 0xff;
      else if (filter === 2) val = (raw + b) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        else pr = c;
        val = (raw + pr) & 0xff;
      }
      destRow[x] = val;
    }
  }
  
  const corners = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]
  ];
  console.log(`=== ${filePath} (${width}x${height}) ===`);
  corners.forEach(([x, y]) => {
    const idx = (y * width + x) * 4;
    console.log(`Corner (${x}, ${y}): R=${reconstructed[idx]} G=${reconstructed[idx+1]} B=${reconstructed[idx+2]} A=${reconstructed[idx+3]}`);
  });
  
  let nonZeroBorderPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < 5 || x >= width - 5 || y < 5 || y >= height - 5) {
        const idx = (y * width + x) * 4;
        if (reconstructed[idx + 3] > 10) nonZeroBorderPixels++;
      }
    }
  }
  console.log(`Non-zero alpha border pixels in outer 5px: ${nonZeroBorderPixels}`);
}

['src/assets/mascots/bear-love.png', 'src/assets/mascots/bear-sleepy.png', 'src/assets/mascots/bear-peek.png'].forEach(checkPngEdges);
