import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Download,
} from 'lucide-react';
import adminApi from '../../api/adminApi';
import { Button, useToast } from '../../components/ui';

const SAMPLE_CSV = `Code,Name,Category,Finish,BasePrice,BaseMRP,Status,Stock,Tags
"SH-101","Heavy Glass Hinge 90 Deg","Shower Hinges","CP",1250,1500,PUBLISHED,50,"hinge, shower"
"GWB-202","Wall to Glass Bracket","Glass Connectors","SS",850,1100,PUBLISHED,40,"connector, bracket"
"SP-404","Spider Fitting 4-Way","Spider Fittings","SS",3500,4200,DRAFT,25,"facade, spider"`;

export const AdminProductCsvModal = ({ isOpen, onClose, onImported }) => {
  const { addToast } = useToast();
  const [csvContent, setCsvContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result || '');
      setPreviewResult(null);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'glassofy_product_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleValidate = async () => {
    if (!csvContent.trim()) {
      addToast('Please upload or paste CSV content first', 'error');
      return;
    }
    setIsValidating(true);
    setPreviewResult(null);
    try {
      const res = await adminApi.importProductsCsv(csvContent, true);
      setPreviewResult(res?.data || null);
      if (res?.data?.errors?.length === 0) {
        addToast(`Validation passed! ${res.data.createdCount} products ready to import.`, 'success');
      } else {
        addToast(`Validation complete with ${res.data.errors.length} issue(s) detected.`, 'warning');
      }
    } catch (err) {
      console.error('CSV validation failed:', err);
      addToast(err?.message || 'Failed to parse CSV file', 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    setIsImporting(true);
    try {
      const res = await adminApi.importProductsCsv(csvContent, false);
      addToast(
        `Successfully imported ${res?.data?.createdCount || 0} products into catalogue.`,
        'success'
      );
      onImported?.();
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      addToast(err?.message || 'CSV Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-[#2E2622]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#FAF8F4] border border-[#DDD8CF] rounded-[4px] shadow-2xl z-10 my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#DDD8CF] flex items-center justify-between bg-[#F0EDE8]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] bg-[#DDD8CF]/40 text-[#2E2622] flex items-center justify-center border border-[#DDD8CF]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-light text-[#2E2622]">Batch Product CSV Import</h2>
              <p className="text-[12px] text-[#7A726A] mt-0.5">
                Bulk upload products, codes, base prices, categories, and initial stock counts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#7A726A] hover:text-[#2E2622] rounded-[2px] hover:bg-[#DDD8CF]/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Box */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <label className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#DDD8CF] hover:border-[#3A2F2B] rounded-[2px] cursor-pointer bg-[#F0EDE8]/40 transition-colors">
              <Upload className="w-7 h-7 text-[#3A2F2B] mb-2" />
              <span className="text-xs font-medium text-[#2E2622]">Upload CSV File</span>
              <span className="text-[10px] text-[#7A726A] mt-1 font-mono">.csv (UTF-8 formatted)</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="flex flex-col justify-between p-4 bg-[#F0EDE8]/60 border border-[#DDD8CF] rounded-[2px] text-xs sm:w-64 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#2E2622] mb-1">Standard RFC-4180</p>
                <p className="text-[11px] text-[#7A726A] leading-relaxed">
                  Headers required: Code, Name, Category, Finish, BasePrice, BaseMRP, Status, Stock, Tags.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="text-[11px] flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#3A2F2B]" />
                <span>Download Sample</span>
              </Button>
            </div>
          </div>

          {/* Raw Text Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#7A726A]">
                Raw CSV Data (Paste or inspect content)
              </label>
              {csvContent && (
                <button
                  type="button"
                  onClick={() => {
                    setCsvContent('');
                    setPreviewResult(null);
                  }}
                  className="text-[11px] text-[#7A726A] hover:text-[#A4493D] underline"
                >
                  Clear data
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                setPreviewResult(null);
              }}
              placeholder={`Code,Name,Category,Finish,BasePrice,BaseMRP,Status,Stock,Tags\n"SH-101","Heavy Glass Hinge 90 Deg","Shower Hinges","CP",1250,1500,PUBLISHED,50,"hinge, shower"`}
              className="w-full bg-[#FAF8F4] font-mono text-xs text-[#2E2622] border border-[#DDD8CF] rounded-[2px] p-3 focus:outline-none focus:border-[#3A2F2B] leading-relaxed"
            />
          </div>

          {/* Validation & Preview Report Section */}
          {previewResult && (
            <div className="space-y-4 pt-4 border-t border-[#DDD8CF] animate-in fade-in">
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 rounded-[2px] bg-[#F0EDE8]/50 border border-[#DDD8CF] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[2px] bg-[#4F6B4A]/10 text-[#4F6B4A] flex items-center justify-center font-bold text-sm">
                    {previewResult.createdCount || 0}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2E2622]">Valid Rows</p>
                    <p className="text-[10px] text-[#7A726A]">Ready for instant ingestion</p>
                  </div>
                </div>

                <div className="flex-1 p-3 rounded-[2px] bg-[#F0EDE8]/50 border border-[#DDD8CF] flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-[2px] flex items-center justify-center font-bold text-sm ${
                      previewResult.errors?.length > 0
                        ? 'bg-[#A4493D]/10 text-[#A4493D]'
                        : 'bg-[#DDD8CF]/40 text-[#7A726A]'
                    }`}
                  >
                    {previewResult.errors?.length || 0}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2E2622]">Issues Detected</p>
                    <p className="text-[10px] text-[#7A726A]">Rows with missing or invalid fields</p>
                  </div>
                </div>
              </div>

              {/* Error Breakdown Table */}
              {previewResult.errors?.length > 0 && (
                <div className="bg-[#A4493D]/5 border border-[#A4493D]/20 rounded-[2px] p-3 space-y-2">
                  <div className="flex items-center gap-2 text-[#A4493D] text-xs font-bold font-mono">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Error Report</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {previewResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-[11px] text-[#2E2622] font-mono py-1 border-b border-[#A4493D]/10 last:border-0"
                      >
                        <span className="text-[#A4493D] font-bold shrink-0">Row {err.row}:</span>
                        <span>{err.reason || err.error || 'Invalid product row format'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#DDD8CF] flex items-center justify-between bg-[#F0EDE8]/60 rounded-b-[4px]">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleValidate}
              disabled={isValidating || !csvContent.trim()}
              className="text-xs flex items-center gap-2"
            >
              {isValidating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Validate & Preview</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleImport}
              disabled={
                isImporting ||
                !csvContent.trim() ||
                (previewResult && previewResult.createdCount === 0)
              }
              className="text-xs flex items-center gap-2"
            >
              {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Import Products</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductCsvModal;
