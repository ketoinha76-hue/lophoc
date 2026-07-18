import fs from 'fs';
import path from 'path';

// 1. Read dist/index.html
const distDir = path.join(process.cwd(), 'dist');
const htmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error("Vui lòng chạy 'npm run build' trước khi đóng gói!");
  process.exit(1);
}

let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Helper to find file in dist/assets
const getAssetContent = (fileName) => {
  const assetsDir = path.join(distDir, 'assets');
  const filePath = path.join(assetsDir, fileName);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
};

// Prepare output dir
const outputDir = path.join(process.cwd(), 'gas-dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Clear any old JS_Part files from previous strategy
try {
  const filesInOutputDir = fs.readdirSync(outputDir);
  for (const file of filesInOutputDir) {
    fs.unlinkSync(path.join(outputDir, file));
  }
} catch (e) {
  console.log("Không thể dọn dẹp thư mục cũ:", e.message);
}

// 2. Replace stylesheet link tags with <style>...</style>
const cssRegExp = /<link\s+[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/g;
let cssMatch;
while ((cssMatch = cssRegExp.exec(htmlContent)) !== null) {
  const fullTag = cssMatch[0];
  const cssFileName = cssMatch[1];
  const cssContent = getAssetContent(cssFileName);
  if (cssContent) {
    const cleanedCss = cssContent.replace(/\/\*# sourceMappingURL=.*\*\//g, '');
    htmlContent = htmlContent.split(fullTag).join(`<style>${cleanedCss}</style>`);
  }
}

// Also handle non-absolute paths just in case
const cssRegExp2 = /<link\s+[^>]*href="([^"]+\.css)"[^>]*>/g;
let cssMatch2;
while ((cssMatch2 = cssRegExp2.exec(htmlContent)) !== null) {
  const fullTag = cssMatch2[0];
  const cssHref = cssMatch2[1];
  const cssFileName = path.basename(cssHref);
  const cssContent = getAssetContent(cssFileName);
  if (cssContent) {
    const cleanedCss = cssContent.replace(/\/\*# sourceMappingURL=.*\*\//g, '');
    htmlContent = htmlContent.split(fullTag).join(`<style>${cleanedCss}</style>`);
  }
}

// Remove modulepreload link tags
htmlContent = htmlContent.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, '');

// 3. NEW STRATEGY: Inline JS directly as a base64 string embedded IN Index.html
//    No more JS_Part files - no more GAS Scriptlet template issues.
const jsRegExp = /<script\s+[^>]*src="\/assets\/([^"]+\.js)"[^>]*><\/script>/g;
let jsMatch;
const jsFilesToInline = [];
while ((jsMatch = jsRegExp.exec(htmlContent)) !== null) {
  jsFilesToInline.push({ fullTag: jsMatch[0], fileName: jsMatch[1] });
}
// Also handle non-absolute paths
const jsRegExp2 = /<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/g;
let jsMatch2;
while ((jsMatch2 = jsRegExp2.exec(htmlContent)) !== null) {
  const fullTag = jsMatch2[0];
  if (!jsFilesToInline.some(item => item.fullTag === fullTag)) {
    jsFilesToInline.push({ fullTag, fileName: path.basename(jsMatch2[1]) });
  }
}

for (const item of jsFilesToInline) {
  const jsContent = getAssetContent(item.fileName);
  if (!jsContent) continue;

  const cleanedJs = jsContent.replace(/\/\/# sourceMappingURL=.*$/gm, '');

  console.log(`Processing JS file ${item.fileName} (${(cleanedJs.length / 1024 / 1024).toFixed(2)} MB)...`);

  // Encode entire JS as one base64 string
  const base64Full = Buffer.from(cleanedJs, 'utf-8').toString('base64');

  // Split base64 string into safe JS string chunks (no newlines in each chunk)
  const CHUNK_SIZE = 30000; // 30KB per string literal to avoid GAS 2MB script limit
  const b64Chunks = [];
  for (let i = 0; i < base64Full.length; i += CHUNK_SIZE) {
    b64Chunks.push(base64Full.substring(i, i + CHUNK_SIZE));
  }
  console.log(`  -> Split into ${b64Chunks.length} inline string chunk(s).`);

  // Build the inline loader script - all data embedded directly, no external files needed
  const chunksJs = b64Chunks.map(c => JSON.stringify(c)).join(',\n    ');
  const inlineScript = `<script type="text/javascript">
(function() {
  try {
    var parts = [
    ${chunksJs}
    ];
    var base64 = parts.join('');
    var binString = atob(base64);
    var bytes = new Uint8Array(binString.length);
    for (var i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    var decodedJs = new TextDecoder('utf-8').decode(bytes);
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = decodedJs;
    document.head.appendChild(script);
    console.log('[GAS Bundle] JS loaded successfully.');
  } catch(err) {
    console.error('[GAS Bundle] Decode error:', err);
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;padding:20px;z-index:99999;font-size:14px;';
    overlay.innerText = 'Loi tai ung dung: ' + err.toString();
    (document.body || document.documentElement).appendChild(overlay);
  }
})();
</script>`;

  htmlContent = htmlContent.split(item.fullTag).join(inlineScript);
}

// 4. Inject Google Apps Script web app auto-url detection at the top of <head>
const gasUrlScript = `
  <script>
    try {
      var gasUrl = "<?= ScriptApp.getService().getUrl() ?>";
      if (gasUrl && gasUrl.indexOf('http') === 0) {
        localStorage.setItem("gas_web_app_url", gasUrl);
        window.GAS_WEB_APP_URL = gasUrl;
        console.log('[GAS] Web App URL configured: ' + gasUrl);
      }
    } catch(e) {
      console.warn('[GAS] Not in GAS environment:', e);
    }
  </script>
`;
htmlContent = htmlContent.split('<head>').join(`<head>${gasUrlScript}`);

// 5. Update document title
htmlContent = htmlContent.replace(/<title>[^<]*<\/title>/, '<title>Lớp Nhạc Huỳnh Long</title>');

// 6. Save the SINGLE output file to gas-dist/Index.html
const outputPath = path.join(outputDir, 'Index.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');

const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log("====================================================");
console.log("🎉 Đóng gói Google Apps Script THÀNH CÔNG!");
console.log(`📂 File duy nhất cần dùng: /gas-dist/Index.html (${fileSizeKB} KB)`);
console.log("====================================================");
console.log("👉 Chỉ cần 1 bước: Dán nội dung Index.html này vào file 'Index' trên Apps Script.");
console.log("   KHÔNG cần tạo thêm file JS_Part1, JS_Part2 nữa!");
