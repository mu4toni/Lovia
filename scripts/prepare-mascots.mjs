import fs from 'fs';
import path from 'path';
import http from 'http';
import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const MASCOTS = [
  {
    name: 'bear-love',
    src: 'C:/Users/marsel/.gemini/antigravity/brain/aeddcfac-2076-46b4-8b9e-19dc8553ab5f/.user_uploaded/media_1794842390458_0379ec14.jpg',
    type: 'white',
  },
  {
    name: 'bear-sleepy',
    src: 'C:/Users/marsel/.gemini/antigravity/brain/aeddcfac-2076-46b4-8b9e-19dc8553ab5f/.user_uploaded/media_1794842390270_5c7999d5.jpg',
    type: 'white',
  },
  {
    name: 'bear-peek',
    src: 'C:/Users/marsel/.gemini/antigravity/brain/aeddcfac-2076-46b4-8b9e-19dc8553ab5f/.user_uploaded/media_1794842390454_9a2b9302.jpg',
    type: 'cream',
  },
];

const outDir = path.resolve('src/assets/mascots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Convert images to base64
const mascotsData = MASCOTS.map((m) => {
  const buf = fs.readFileSync(m.src);
  return {
    name: m.name,
    type: m.type,
    dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
  };
});

// HTML page that will load in Chrome and perform flood-fill transparency
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mascot Processor</title>
</head>
<body>
  <h1>Processing Mascots...</h1>
  <script>
    const mascots = ${JSON.stringify(mascotsData)};

    async function processImage(item) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Corner sampling for background color
          const corners = [
            0,
            (w - 1) * 4,
            (h - 1) * w * 4,
            ((h - 1) * w + (w - 1)) * 4,
          ];
          let bgR = 0, bgG = 0, bgB = 0;
          for (const c of corners) {
            bgR += data[c];
            bgG += data[c + 1];
            bgB += data[c + 2];
          }
          bgR /= 4; bgG /= 4; bgB /= 4;

          // Flood-fill BFS from all four outer boundaries
          const visited = new Uint8Array(w * h);
          const queue = new Int32Array(w * h);
          let head = 0, tail = 0;

          function isBg(idx) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (item.type === 'white') {
              // White background: high lightness or near bg
              const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
              const minCh = Math.min(r, g, b);
              return diff < 42 || minCh > 240;
            } else {
              // Cream background (for bear-peek sticker)
              // Distance to cream bg
              const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
              return diff < 38;
            }
          }

          // Push boundary pixels
          for (let x = 0; x < w; x++) {
            const topIdx = x;
            const btmIdx = (h - 1) * w + x;
            if (isBg(topIdx * 4)) {
              visited[topIdx] = 1;
              queue[tail++] = topIdx;
            }
            if (isBg(btmIdx * 4)) {
              visited[btmIdx] = 1;
              queue[tail++] = btmIdx;
            }
          }
          for (let y = 0; y < h; y++) {
            const leftIdx = y * w;
            const rightIdx = y * w + (w - 1);
            if (!visited[leftIdx] && isBg(leftIdx * 4)) {
              visited[leftIdx] = 1;
              queue[tail++] = leftIdx;
            }
            if (!visited[rightIdx] && isBg(rightIdx * 4)) {
              visited[rightIdx] = 1;
              queue[tail++] = rightIdx;
            }
          }

          // Run BFS
          while (head < tail) {
            const curr = queue[head++];
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            const neighbors = [];
            if (cx > 0) neighbors.push(curr - 1);
            if (cx < w - 1) neighbors.push(curr + 1);
            if (cy > 0) neighbors.push(curr - w);
            if (cy < h - 1) neighbors.push(curr + w);

            for (const n of neighbors) {
              if (!visited[n] && isBg(n * 4)) {
                visited[n] = 1;
                queue[tail++] = n;
              }
            }
          }

          // Apply transparency + 2px soft edge feathering
          const feather = new Float32Array(w * h);
          for (let i = 0; i < w * h; i++) {
            if (visited[i]) {
              feather[i] = 1.0;
            }
          }

          // Find edge pixels to feather
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const i = y * w + x;
              if (visited[i]) continue;
              // Check if adjacent to visited
              let bgCount = 0;
              if (visited[i - 1]) bgCount++;
              if (visited[i + 1]) bgCount++;
              if (visited[i - w]) bgCount++;
              if (visited[i + w]) bgCount++;
              if (bgCount > 0) {
                // Smooth transition
                const px = i * 4;
                const r = data[px], g = data[px+1], b = data[px+2];
                const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                if (diff < 50) {
                  data[px + 3] = Math.max(0, Math.min(255, Math.round(255 * (diff / 50))));
                }
              }
            }
          }

          for (let i = 0; i < w * h; i++) {
            if (visited[i]) {
              data[i * 4 + 3] = 0; // Fully transparent
            }
          }

          ctx.putImageData(imgData, 0, 0);

          // Find bounding box of non-transparent content to trim excess empty borders
          let minX = w, maxX = 0, minY = h, maxY = 0;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const a = data[(y * w + x) * 4 + 3];
              if (a > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // Add 4px padding
          const pad = 6;
          minX = Math.max(0, minX - pad);
          minY = Math.max(0, minY - pad);
          maxX = Math.min(w - 1, maxX + pad);
          maxY = Math.min(h - 1, maxY + pad);
          const cropW = maxX - minX + 1;
          const cropH = maxY - minY + 1;

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

          resolve(croppedCanvas.toDataURL('image/png'));
        };
        img.src = item.dataUrl;
      });
    }

    async function run() {
      const results = {};
      for (const m of mascots) {
        results[m.name] = await processImage(m);
      }
      await fetch('/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results),
      });
    }
    run();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (req.method === 'POST' && req.url === '/done') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      const results = JSON.parse(body);
      for (const [name, dataUrl] of Object.entries(results)) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const outPath = path.join(outDir, `${name}.png`);
        fs.writeFileSync(outPath, Buffer.from(base64Data, 'base64'));
        console.log(`✅ Сохранено: ${outPath} (${fs.statSync(outPath).size} bytes)`);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 500);
    });
  }
});

server.listen(9876, () => {
  console.log('🚀 Запуск Chrome для обработки маскотов...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    'http://localhost:9876',
  ]);
  chrome.on('error', (err) => {
    console.error('Chrome spawn error:', err);
  });
});
