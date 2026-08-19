import re

with open('src/components/BerkasView.tsx', 'r') as f:
    code = f.read()

camera_target = """  const startCamera = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setUseCamera(true);
      setFileBase64(null); // Clear previous if any
    } catch (err: any) {
      setErrorMsg('Gagal mengakses kamera: ' + err.message);
    }
  };"""

camera_replacement = """  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async (mode = facingMode) => {
    setErrorMsg('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setUseCamera(true);
      setFileBase64(null);
      setFacingMode(mode);
    } catch (err: any) {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        streamRef.current = fallbackStream;
        setUseCamera(true);
        setFileBase64(null);
      } catch (fallbackErr: any) {
        setErrorMsg('Gagal mengakses kamera: ' + fallbackErr.message);
      }
    }
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };"""

code = code.replace(camera_target, camera_replacement)

# Now update the UI to include the Switch Camera button

ui_target = """                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-5 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Ambil Foto
                  </button>"""

ui_replacement = """                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2"
                    title="Putar Kamera"
                  >
                    <RefreshCcw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Ambil
                  </button>"""

code = code.replace(ui_target, ui_replacement)

with open('src/components/BerkasView.tsx', 'w') as f:
    f.write(code)

