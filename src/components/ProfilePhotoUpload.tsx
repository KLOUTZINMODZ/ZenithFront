import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

interface ProfilePhotoUploadProps {
  onClose?: () => void;
}

const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({ onClose }) => {
  const { user, uploadProfilePhoto } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.profilePicture || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;


    if (!file.type.match('image.*')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }


    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      return;
    }

    setSelectedFile(file);
    setError(null);


    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };


  const handleUpload = async () => {
    if (!selectedFile && !preview) {
      setError('Por favor, selecione uma imagem');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {

      const imageToUpload = selectedFile ? preview : user?.profilePicture;
      
      if (!imageToUpload) {
        throw new Error('Nenhuma imagem selecionada');
      }


      const success = await uploadProfilePhoto(imageToUpload);

      if (success) {
        setSuccess(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        throw new Error('Erro ao atualizar foto de perfil');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload da imagem');
          } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-photo-upload p-8 bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700/50 max-w-md mx-auto shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Alterar Foto de Perfil</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-700/50"
          >
            &times;
          </button>
        )}
      </div>
      
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4 group">
          <div className="w-36 h-36 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-[3px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-gradient-to-r from-purple-400/20 to-blue-400/20 backdrop-blur-sm rounded-full flex items-center justify-center overflow-hidden">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Camera className="w-14 h-14 text-white/80" />
              )}
            </div>
          </div>
          <label htmlFor="photo-upload" className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center hover:from-purple-700 hover:to-blue-700 transition-all duration-200 cursor-pointer shadow-lg transform hover:scale-110 active:scale-95">
            <Camera className="w-5 h-5 text-white" />
          </label>
          <input 
            id="photo-upload"
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="hidden"
          />
        </div>
        <p className="text-gray-400 text-sm">Clique no ícone da câmera para selecionar uma imagem</p>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3 mb-4">
          <p className="text-green-400 text-sm">Foto de perfil atualizada com sucesso!</p>
        </div>
      )}
      
      <div className="flex gap-3">
        <Button 
          onClick={handleUpload} 
          disabled={loading}
          className="w-full py-3"
        >
          {loading ? 'Enviando...' : 'Salvar Foto'}
        </Button>
        
        {onClose && (
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full py-3"
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoUpload;