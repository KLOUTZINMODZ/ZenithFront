


class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
    this.components = {};
  }

  


  async generate() {
    try {
      this.components = {

        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages?.join(',') || '',
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        

        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,
        

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        

        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        

        canvas: await this.generateCanvasFingerprint(),
        

        webgl: this.generateWebGLFingerprint(),
        

        audio: await this.generateAudioFingerprint(),
        

        fonts: await this.detectFonts(),
        

        plugins: this.getPlugins(),
        

        localStorage: this.testLocalStorage(),
        sessionStorage: this.testSessionStorage(),
        indexedDB: this.testIndexedDB(),
        

        connection: this.getConnectionInfo(),
        

        battery: await this.getBatteryInfo(),
        

        mediaDevices: await this.getMediaDevices()
      };


      this.fingerprint = await this.hashComponents();
      
      return {
        fingerprint: this.fingerprint,
        components: this.components,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      
      return {
        fingerprint: await this.generateBasicFingerprint(),
        components: { error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }

  


  async generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test 123', 2, 2);
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(50, 50, 100, 50);
      
      ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(100, 100, 50, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(200, 200);
      ctx.stroke();
      
      return canvas.toDataURL();
    } catch (error) {
      return `canvas_error_${error.message}`;
    }
  }

  


  generateWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'webgl_not_supported';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      
      return {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
        unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown'
      };
    } catch (error) {
      return `webgl_error_${error.message}`;
    }
  }

  


  async generateAudioFingerprint() {
    try {
      if (!window.AudioContext && !window.webkitAudioContext) {
        return 'audio_not_supported';
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;
      
      gainNode.gain.value = 0;
      
      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      
      oscillator.stop();
      await audioContext.close();
      
      return Array.from(frequencyData).slice(0, 50).join(',');
    } catch (error) {
      return `audio_error_${error.message}`;
    }
  }

  


  async detectFonts() {
    const testFonts = [
      'Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia',
      'Verdana', 'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact',
      'Palatino', 'Garamond', 'Bookman', 'Avant Garde', 'Symbol'
    ];

    const availableFonts = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const baselineText = 'DeviceFingerprint';
    ctx.font = '50px Arial';
    const baselineWidth = ctx.measureText(baselineText).width;

    for (const font of testFonts) {
      ctx.font = `50px ${font}, Arial`;
      const width = ctx.measureText(baselineText).width;
      
      if (width !== baselineWidth) {
        availableFonts.push(font);
      }
    }

    return availableFonts.join(',');
  }

  


  getPlugins() {
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename
      });
    }
    return plugins.slice(0, 10);
  }

  


  testLocalStorage() {
    try {
      localStorage.setItem('fingerprint_test', 'test');
      localStorage.removeItem('fingerprint_test');
      return true;
    } catch (error) {
      return false;
    }
  }

  testSessionStorage() {
    try {
      sessionStorage.setItem('fingerprint_test', 'test');
      sessionStorage.removeItem('fingerprint_test');
      return true;
    } catch (error) {
      return false;
    }
  }

  testIndexedDB() {
    return !!window.indexedDB;
  }

  


  getConnectionInfo() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      };
    }
    return 'connection_not_supported';
  }

  


  async getBatteryInfo() {
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return {
          charging: battery.charging,
          level: Math.round(battery.level * 100),
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
      return 'battery_not_supported';
    } catch (error) {
      return `battery_error_${error.message}`;
    }
  }

  


  async getMediaDevices() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
          audioInput: devices.filter(d => d.kind === 'audioinput').length,
          audioOutput: devices.filter(d => d.kind === 'audiooutput').length,
          videoInput: devices.filter(d => d.kind === 'videoinput').length
        };
      }
      return 'media_devices_not_supported';
    } catch (error) {
      return `media_devices_error_${error.message}`;
    }
  }

  


  async hashComponents() {
    const componentsString = JSON.stringify(this.components);
    const encoder = new TextEncoder();
    const data = encoder.encode(componentsString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  


  async generateBasicFingerprint() {
    const basicString = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('|');

    const encoder = new TextEncoder();
    const data = encoder.encode(basicString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}


const deviceFingerprint = new DeviceFingerprint();


export const generateDeviceFingerprint = async () => {
  return await deviceFingerprint.generate();
};


export const getDeviceFingerprint = async () => {
  if (!deviceFingerprint.fingerprint) {
    return await generateDeviceFingerprint();
  }
  return {
    fingerprint: deviceFingerprint.fingerprint,
    components: deviceFingerprint.components,
    timestamp: new Date().toISOString()
  };
};

export default deviceFingerprint;
