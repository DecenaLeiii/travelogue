import { useState } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function AdminImageField({ label, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const response = await fetch('/api/admin/promo-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, category: 'destinations' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Image upload failed.');
      onChange(result.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="destination-image-field"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) void upload(file);
      }}
      onPaste={(event) => {
        const file = event.clipboardData.files[0];
        if (file) {
          event.preventDefault();
          void upload(file);
        }
      }}
    >
      <div className="destination-image-preview">
        {value ? <img src={value} alt={`${label} preview`} /> : <span>Drop image here</span>}
      </div>
      <div className="destination-image-controls">
        <label>
          {label} URL
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste an image URL or drop an image" />
        </label>
        <label className="destination-image-pick">
          {uploading ? 'Uploading...' : 'Choose image'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ''; }} />
        </label>
        {error && <span className="destination-image-error">{error}</span>}
      </div>
    </div>
  );
}
