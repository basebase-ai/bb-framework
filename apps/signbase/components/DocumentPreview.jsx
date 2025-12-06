/**
 * DocumentPreview - Renders a thumbnail of a PDF document
 */
import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Center, Loader, Text } from '@mantine/core';
import { useStorage } from '../../../framework/hooks/useStorage.js';
import { APP_ID } from '../schema.js';

// Set up the worker - use jsdelivr CDN (more reliable than unpkg)
// react-pdf 10.2.0 uses PDF.js 5.4.296
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

/**
 * @typedef {Object} DocumentPreviewProps
 * @property {string} filePath - The path of the PDF file in storage (optional if fileUrl provided)
 * @property {string} fileUrl - The direct URL to the PDF file (preferred if available)
 */

/**
 * @param {DocumentPreviewProps} props
 */
export function DocumentPreview({ filePath, fileUrl: propFileUrl }) {
  const [fileUrl, setFileUrl] = useState(propFileUrl || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useFallback, setUseFallback] = useState(false);
  const { getURL } = useStorage(APP_ID);

  useEffect(() => {
    // If we already have a URL, use it directly
    if (propFileUrl) {
      setFileUrl(propFileUrl);
      setLoading(false);
      return;
    }

    // Otherwise, convert filePath to URL
    if (filePath) {
      setLoading(true);
      getURL(filePath)
        .then(url => {
          setFileUrl(url);
          setError(null);
        })
        .catch(err => {
          console.error("Error getting file URL:", err);
          setError(err.message || "Failed to load file");
          setFileUrl(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [filePath, propFileUrl, getURL]);

  if (loading) {
    return <Center h={100}><Loader size="sm" /></Center>;
  }

  if (error || !fileUrl) {
    return (
      <Center h={100}>
        <Text size="xs" c="red" ta="center">
          {error || "No file available"}
        </Text>
      </Center>
    );
  }

  // Fallback to iframe if react-pdf fails
  if (useFallback) {
    return (
      <iframe
        src={`${fileUrl}#page=1&zoom=50`}
        style={{
          width: '100%',
          height: 200,
          border: 'none',
          backgroundColor: '#f5f5f5'
        }}
        title="PDF Preview"
      />
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: 200, 
      overflow: 'hidden', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <Document
        file={fileUrl}
        loading={<Center h={100}><Loader size="sm" /></Center>}
        error={
          <Center h={100}>
            <Text size="xs" c="red" ta="center">
              Failed to load preview
            </Text>
          </Center>
        }
        onLoadSuccess={() => {
          setLoading(false);
          setError(null);
        }}
        onLoadError={(error) => {
          console.error("PDF load error:", error);
          // If worker fails, try iframe fallback
          if (error.message?.includes('worker') || error.message?.includes('fetch')) {
            setUseFallback(true);
          } else {
            setError(error.message || "Failed to load PDF");
            setLoading(false);
          }
        }}
      >
        <Page 
          pageNumber={1} 
          width={200} 
          renderTextLayer={false} 
          renderAnnotationLayer={false}
          scale={1}
        />
      </Document>
    </div>
  );
}
