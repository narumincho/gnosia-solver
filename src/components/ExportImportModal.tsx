import { useState } from "preact/hooks";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Upload,
  X,
} from "lucide-preact";
import { SessionData } from "../types.ts";

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => SessionData;
  onImport: (data: unknown) => { success: boolean; error?: string | undefined };
}

export function ExportImportModal({
  isOpen,
  onClose,
  onExport,
  onImport,
}: ExportImportModalProps) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sessionData = onExport();
  const jsonString = JSON.stringify(sessionData, null, 2);

  // ファイルとしてダウンロード
  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `gnosia-session-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(
        "クリップボードへのコピーに失敗しました。下のテキストを直接選択してコピーしてください。",
      );
    }
  };

  // ファイル読み込みインポート
  const handleFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed: unknown = JSON.parse(text);
        const res = onImport(parsed);
        if (res.success) {
          setSuccessMessage("インポートが完了しました！");
          setErrorMessage(null);
          setTimeout(() => {
            onClose();
          }, 800);
        } else {
          setErrorMessage(res.error || "データの形式が不正です。");
          setSuccessMessage(null);
        }
      } catch (err: unknown) {
        setErrorMessage(
          "JSONの解析に失敗しました: " +
            (err instanceof Error ? err.message : String(err)),
        );
        setSuccessMessage(null);
      }
    };
    reader.readAsText(file);
  };

  // テキスト貼り付けインポート
  const handleTextImport = () => {
    if (!importText.trim()) {
      setErrorMessage("JSONテキストを入力してください。");
      return;
    }

    try {
      const parsed: unknown = JSON.parse(importText);
      const res = onImport(parsed);
      if (res.success) {
        setSuccessMessage("インポートが完了しました！");
        setErrorMessage(null);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || "データの形式が不正です。");
        setSuccessMessage(null);
      }
    } catch (err: unknown) {
      setErrorMessage(
        "無効なJSON形式です: " +
          (err instanceof Error ? err.message : String(err)),
      );
      setSuccessMessage(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "680px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={20} color="var(--text-accent)" />
            <h3 className="modal-title">
              セッションのエキスポート / インポート
            </h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* タブ切り替え */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.2rem",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "0.5rem",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${
              activeTab === "export" ? "btn-primary" : ""
            }`}
            onClick={() => {
              setActiveTab("export");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            <Download size={14} />
            <span>エクスポート (保存)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              activeTab === "import" ? "btn-primary" : ""
            }`}
            onClick={() => {
              setActiveTab("import");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            <Upload size={14} />
            <span>インポート (復元)</span>
          </button>
        </div>

        {errorMessage && (
          <div className="alert-box" style={{ marginBottom: "1rem" }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid #10b981",
              color: "#34d399",
              padding: "0.8rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* エクスポートタブ */}
        {activeTab === "export" && (
          <div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "1rem",
              }}
            >
              現在のゲーム設定、記録されたイベント（{sessionData.events
                .length}件）、現在の日数、視点状態を保存します。
            </p>

            <div
              style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownload}
              >
                <Download size={16} />
                <span>JSONファイルをダウンロード</span>
              </button>
              <button type="button" className="btn" onClick={handleCopy}>
                {copied
                  ? <Check size={16} color="#34d399" />
                  : <Copy size={16} />}
                <span>
                  {copied ? "コピーしました！" : "クリップボードにコピー"}
                </span>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">JSONデータ プレビュー</label>
              <textarea
                readOnly
                className="form-input"
                style={{
                  height: "220px",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  resize: "vertical",
                  lineHeight: "1.4",
                }}
                value={jsonString}
              />
            </div>
          </div>
        )}

        {/* インポートタブ */}
        {activeTab === "import" && (
          <div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginBottom: "1rem",
              }}
            >
              保存したJSONファイル、またはコピーしたJSONテキストからゲーム状況を完全に復元します。
            </p>

            <div style={{ marginBottom: "1.2rem" }}>
              <label className="form-label">方法1: ファイルから読み込む</label>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{
                  background: "#1e293b",
                  border: "1px dashed var(--border-color)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  width: "100%",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                方法2: JSONテキストを貼り付けて読み込む
              </label>
              <textarea
                className="form-input"
                style={{
                  height: "160px",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  resize: "vertical",
                  lineHeight: "1.4",
                }}
                placeholder="ここにエクスポートしたJSONを貼り付けてください..."
                value={importText}
                onInput={(e) =>
                  setImportText((e.target as HTMLTextAreaElement).value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTextImport}
              >
                <Upload size={16} />
                <span>テキストからインポート実行</span>
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1.5rem",
            borderTop: "1px solid var(--border-color)",
            paddingTop: "0.75rem",
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
