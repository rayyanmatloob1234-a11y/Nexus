import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

interface SignatureModalProps {
  documentName: string;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
  submitting: boolean;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  documentName,
  onClose,
  onConfirm,
  submitting,
}) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleConfirm = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    const dataUrl = sigRef.current.getCanvas().toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 480,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
              Sign document
            </h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#9ca3af', padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 8,
              background: '#f9fafb',
              overflow: 'hidden',
            }}
          >
            <SignatureCanvas
              ref={sigRef}
              penColor="#1e293b"
              canvasProps={{
                width: 432,
                height: 180,
                style: { width: '100%', height: 180, display: 'block' },
              }}
              onEnd={() => setIsEmpty(false)}
            />
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            Sign above using your mouse or touchscreen
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <button
            onClick={handleClear}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: '#6b7280', fontSize: 13, fontWeight: 500,
            }}
          >
            <RotateCcw size={14} />
            Clear
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} isLoading={submitting} disabled={isEmpty}>
              Confirm signature
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};