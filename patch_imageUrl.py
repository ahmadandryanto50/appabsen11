import re

with open('src/utils/imageUrl.ts', 'r') as f:
    code = f.read()

replacement = """
  // Final failure callback: Try using the server-side proxy
  if (currentSrc.includes('lh3') || currentSrc.includes('drive.google.com') || currentSrc.includes('googleusercontent')) {
    // Prevent infinite loop if the proxy itself fails
    if (!currentSrc.includes('/api/proxy-image?url=')) {
      const originalUrl = e.currentTarget.getAttribute('data-original-src') || currentSrc;
      img.setAttribute('data-original-src', originalUrl);
      img.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
      return;
    }
  }

  if (onFinalFail) {
    onFinalFail();
  } else {
    // Show a fallback initial avatar/image instead of hiding it
    if (img.classList.contains('rounded-full')) {
      // It's likely a user photo avatar
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e2e8f0" width="100" height="100"/><circle fill="%2394a3b8" cx="50" cy="40" r="20"/><path fill="%2394a3b8" d="M20,100 Q50,70 80,100 Z"/></svg>';
    } else {
      // Probably a logo
      img.src = '/logo_smpn11.jpg'; // Default logo
    }
  }
}
"""

if 'proxy-image' not in code:
    code = code.replace("""  // Final failure callback
  if (onFinalFail) {
    onFinalFail();
  } else {
    img.style.display = 'none';
  }
}""", replacement)
    
    with open('src/utils/imageUrl.ts', 'w') as f:
        f.write(code)

