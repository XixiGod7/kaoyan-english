import { ExternalLink, Download } from 'lucide-react';
import type { PaperResource } from '../types/paper';

interface PdfViewerProps {
  resource: PaperResource;
}

export default function PdfViewer({ resource }: PdfViewerProps) {
  const fileUrl = resource.filePath;

  return (
    <div style={{ background: '#fff', overflow: 'hidden' }}>
      {/* 工具栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#fafafa',
        borderBottom: '1px solid #e7e9ee',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#666' }}>
          <FileIcon style={{ width: 16, height: 16, color: '#FF8247' }} />
          <span style={{ fontWeight: 600, color: '#1a1a1a', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {resource.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', fontSize: '12px', fontWeight: 500,
              background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px',
              color: '#374151', cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <ExternalLink style={{ width: 14, height: 14 }} />
            新窗口打开
          </a>
          <a
            href={fileUrl}
            download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', fontSize: '12px', fontWeight: 500,
              background: '#2E3192', color: '#fff', borderRadius: '6px',
              cursor: 'pointer', textDecoration: 'none',
              transition: 'all 0.2s', border: 'none',
            }}
          >
            <Download style={{ width: 14, height: 14 }} />
            下载文件
          </a>
        </div>
      </div>

      {/* PDF 预览 */}
      <div className="pdf-viewer-body">
        <embed
          src={fileUrl}
          type="application/pdf"
          width="100%"
          height="100%"
          title={resource.label}
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}

function FileIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
