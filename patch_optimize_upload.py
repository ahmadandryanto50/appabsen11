import re

# 1. Update src/api.ts to use 90s timeout for uploadBerkas
with open('src/api.ts', 'r') as f:
    api_code = f.read()

target_api = "const res = await safeCallGAS(url, 'uploadToDrive', {"
replacement_api = "const res = await safeCallGAS(url, 'uploadToDrive', {"

api_code = api_code.replace(
    "const res = await safeCallGAS(url, 'uploadToDrive', {",
    "const res = await safeCallGAS(url, 'uploadToDrive', {"
)

# Replace the closing brace of safeCallGAS in uploadBerkas to pass 90000 timeout
old_upload = """    const res = await safeCallGAS(url, 'uploadToDrive', {
      payload: {
        filename,
        base64: base64Data,
        folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
        uploader
      },
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    });"""

new_upload = """    const res = await safeCallGAS(url, 'uploadToDrive', {
      payload: {
        filename,
        base64: base64Data,
        folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
        uploader
      },
      filename,
      base64: base64Data,
      folderId: '1OFVFI1xhsk45_ONTihtuSHeBVvEOr44m',
      uploader
    }, false, 0, 90000);"""

api_code = api_code.replace(old_upload, new_upload)
with open('src/api.ts', 'w') as f:
    f.write(api_code)

# 2. Update src/components/BerkasView.tsx for compression
with open('src/components/BerkasView.tsx', 'r') as f:
    berkas_code = f.read()

capture_target = """  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setFileBase64(dataUrl);
      setFileType('image/jpeg');
      stopCamera();
    }
  };"""

capture_replacement = """  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const MAX_DIM = 1200;
    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setFileBase64(dataUrl);
      setFileType('image/jpeg');
      stopCamera();
    }
  };"""

berkas_code = berkas_code.replace(capture_target, capture_replacement)

# Image compression helper for uploaded image files
upload_target = """  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set type limit or compression if necessary, but we'll accept any basic document
      setFileType(file.type);
      if (!fileName) {
        setFileName(file.name.split('.')[0]);
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFileBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };"""

upload_replacement = """  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileType(file.type);
      if (!fileName) {
        setFileName(file.name.split('.')[0]);
      }
      
      // If it's an image, compress it automatically before sending
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIM = 1200;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              setFileBase64(canvas.toDataURL('image/jpeg', 0.7));
            } else {
              setFileBase64(event.target?.result as string);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setFileBase64(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };"""

berkas_code = berkas_code.replace(upload_target, upload_replacement)

with open('src/components/BerkasView.tsx', 'w') as f:
    f.write(berkas_code)

print("Optimizations applied!")
