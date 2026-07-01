import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, PenTool } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SignatureModal } from '../../components/documents/SignatureModal';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000/api';

interface Doc {
  id: string;
  filename: string;
  storageUrl: string;
  version: number;
  status: 'DRAFT' | 'SIGNED' | 'ARCHIVED';
  uploadedAt: string;
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signDoc, setSignDoc] = useState<Doc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem('business_nexus_token');

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API}/documents/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      toast.success('Document uploaded!');
      fetchDocuments();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmSignature = async (signatureDataUrl: string) => {
    if (!signDoc) return;
    setSigning(true);
    try {
      const res = await fetch(`${API}/documents/${signDoc.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureImageUrl: signatureDataUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signing failed');

      toast.success('Document signed!');
      setSignDoc(null);
      fetchDocuments();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSigning(false);
    }
  };

  const statusVariant = (status: string) => {
    if (status === 'SIGNED') return 'success';
    if (status === 'ARCHIVED') return 'gray';
    return 'warning';
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Upload, manage, and sign your startup's important files</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
        <Button leftIcon={<Upload size={18} />} onClick={handleUploadClick} isLoading={uploading}>
          Upload Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">All Documents</h2>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p className="text-gray-500 text-sm">Loading documents...</p>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No documents uploaded yet</p>
              <p className="text-sm text-gray-500 mt-1">PDF, images, and Word documents up to 10MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                >
                  <div className="p-2 bg-primary-50 rounded-lg mr-4">
                    <FileText size={24} className="text-primary-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </h3>
                      <Badge variant={statusVariant(doc.status) as any} size="sm">
                        {doc.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>Version {doc.version}</span>
                      <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a href={doc.storageUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
                        <Download size={18} />
                      </Button>
                    </a>

                    {doc.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2"
                        aria-label="Sign"
                        onClick={() => setSignDoc(doc)}
                      >
                        <PenTool size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {signDoc && (
        <SignatureModal
          documentName={signDoc.filename}
          onClose={() => setSignDoc(null)}
          onConfirm={handleConfirmSignature}
          submitting={signing}
        />
      )}
    </div>
  );
};