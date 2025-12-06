import chatApi from './chatApi';

export interface UploadedImage {
  url: string;
  thumbUrl?: string;
  urlJpeg?: string;
  thumbUrlJpeg?: string;
  name?: string;
  size?: number;
  mimeType?: string;
  originalMimeType?: string;
  width?: number;
  height?: number;
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/avif'];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function validateFile(file: File) {
  if (!ALLOWED.includes(file.type)) {
    throw new Error('Formato não suportado. Use PNG, JPG, JPEG ou AVIF.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 8MB.');
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler arquivo para Base64'));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(conversationId: string, file: File): Promise<UploadedImage> {
  validateFile(file);
  const form = new FormData();
  form.append('file', file);
  form.append('conversationId', conversationId);
  try {
    const res = await chatApi.post('/api/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.data as UploadedImage;
  } catch (error: any) {
        throw error;
  }
}


async function uploadImageBase64(conversationId: string, file: File): Promise<UploadedImage> {
  validateFile(file);
  const dataUrl = await fileToDataUrl(file);
  try {
    const res = await chatApi.post('/api/uploads/image-base64', {
      conversationId,
      dataUrl,
      name: file.name
    });
    return res.data.data as UploadedImage;
  } catch (error: any) {
        throw error;
  }
}

async function sendImageMessage(conversationId: string, attachment: UploadedImage) {
  const res = await chatApi.post(`/api/messages/conversations/${conversationId}/messages`, {
    content: '',
    type: 'image',
    attachments: [attachment]
  });
  return res.data?.data;
}

export default { uploadImage, uploadImageBase64, sendImageMessage, validateFile };
