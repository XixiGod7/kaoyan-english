import { useState, useEffect } from 'react';
import { ExternalLink, Download } from 'lucide-react';
import type { PaperResource } from '../types/paper';

interface PdfViewerProps {
  resource: PaperResource;
}

export default function PdfViewer({ resource }: PdfViewerProps) {
  const fileUrl = resource.filePath;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200/60">
        <div className="flex items-center gap-2 text-sm text-[#64748B]">
          <FileIcon className="w-4 h-4 text-[#D97706]" />
          <span className="font-medium text-[#1E293B] truncate max-w-md">{resource.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       bg-white border border-slate-300 rounded-lg hover:bg-slate-50
                       text-[#1E293B] transition-colors duration-200 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            新窗口打开
          </a>
          <a
            href={fileUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2E5B8C]
                       transition-colors duration-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            下载文件
          </a>
        </div>
      </div>

      {/* PDF 预览 - embed 标签 */}
      <div style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
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

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
