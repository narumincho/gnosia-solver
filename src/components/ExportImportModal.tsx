import { useEffect, useRef, useState } from "preact/hooks";
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-preact";
import { SessionData } from "../types.ts";
import { handleDialogBackdropClick } from "../utils/dialog.ts";
import { SAMPLE_SESSIONS } from "../data/sampleSessions.ts";

type ExportImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => SessionData;
  onImport: (data: unknown) => { success: boolean; error?: string | undefined };
};

export function ExportImportModal({
  isOpen,
  onClose,
  onExport,
  onImport,
}: ExportImportModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    SAMPLE_SESSIONS[0]?.id || "",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setCopied(false);
      setImportText("");
      setErrorMessage(null);
      setSuccessMessage(null);
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

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
            dialogRef.current?.close();
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
          dialogRef.current?.close();
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

  // サンプル読み込み
  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_SESSIONS.find((s) => s.id === sampleId);
    if (!sample) return;

    try {
      const res = onImport(sample.data);
      if (res.success) {
        setSuccessMessage(`サンプル「${sample.title}」を読み込みました！`);
        setErrorMessage(null);
        setTimeout(() => {
          dialogRef.current?.close();
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error || "データの形式が不正です。");
        setSuccessMessage(null);
      }
    } catch (err: unknown) {
      setErrorMessage(
        "サンプルの読み込みに失敗しました: " +
          (err instanceof Error ? err.message : String(err)),
      );
      setSuccessMessage(null);
    }
  };

  const currentSelectedSample = SAMPLE_SESSIONS.find(
    (s) => s.id === selectedSampleId,
  );

  return (
    <dialog
      id="export-import-dialog"
      ref={dialogRef}
      className="modal-dialog"
      style={{ maxWidth: "680px" }}
      onClose={onClose}
      onClick={handleDialogBackdropClick}
    >
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileText size={20} color="var(--text-accent)" />
          <h3 className="modal-title">
            エキスポート / インポート
          </h3>
        </div>
        <button
          type="button"
          className="modal-close-btn"
          command="close"
          commandfor="export-import-dialog"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
      </div>

      {/* タブ切り替え */}
      <div
        role="tablist"
        aria-label="データ管理タブ"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.2rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          id="tab-export"
          role="tab"
          aria-selected={activeTab === "export"}
          aria-controls="tabpanel-export"
          type="button"
          className={`btn btn-sm ${
            activeTab === "export" ? "btn-primary" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("export");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        >
          <Download size={14} />
          <span>エクスポート (保存)</span>
        </button>
        <button
          id="tab-import"
          role="tab"
          aria-selected={activeTab === "import"}
          aria-controls="tabpanel-import"
          type="button"
          className={`btn btn-sm ${
            activeTab === "import" ? "btn-primary" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("import");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        >
          <Upload size={14} />
          <span>インポート (読込)</span>
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
        <div
          id="tabpanel-export"
          role="tabpanel"
          aria-labelledby="tab-export"
        >
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
        <div
          id="tabpanel-import"
          role="tabpanel"
          aria-labelledby="tab-import"
        >
          {/* テストケースのサンプルから読み込む */}
          <div
            style={{
              background: "rgba(56, 189, 248, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.4rem",
              }}
            >
              <Sparkles size={16} color="var(--accent-primary, #38bdf8)" />
              <strong
                style={{
                  fontSize: "0.9rem",
                  color: "var(--accent-primary, #38bdf8)",
                }}
              >
                テストケースのサンプルから読み込む
              </strong>
            </div>

            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginBottom: "0.75rem",
              }}
            >
              単体テストで検証済みの実戦完走データや各種推理パズルをワンクリックで読み込んで試せます。
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <select
                  className="form-input"
                  style={{ flex: 1, minWidth: "220px", fontSize: "0.85rem" }}
                  value={selectedSampleId}
                  onChange={(e) => {
                    const id = (e.target as HTMLSelectElement).value;
                    setSelectedSampleId(id);
                    const sample = SAMPLE_SESSIONS.find((s) => s.id === id);
                    if (sample) {
                      setImportText(JSON.stringify(sample.data, null, 2));
                    }
                  }}
                >
                  {SAMPLE_SESSIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.badge}] {s.title}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleLoadSample(selectedSampleId)}
                >
                  <Upload size={14} />
                  <span>このサンプルを読み込む</span>
                </button>
              </div>

              {currentSelectedSample && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    background: "rgba(15, 23, 42, 0.6)",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    lineHeight: "1.4",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "0.3rem",
                      color: "var(--text-main)",
                      fontWeight: "600",
                    }}
                  >
                    {currentSelectedSample.title}（イベント数:{" "}
                    {currentSelectedSample.data.events.length}件 / Day{" "}
                    {currentSelectedSample.data.currentDay}時点）
                  </div>
                  <div>{currentSelectedSample.description}</div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              textAlign: "center",
              margin: "1.2rem 0",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                borderTop: "1px solid var(--border-color)",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label className="form-label">ファイルから読み込む</label>
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
              貼り付けて読み込む
            </label>
            <textarea
              className="form-input"
              style={{
                height: "140px",
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
        <button
          type="button"
          className="btn"
          command="close"
          commandfor="export-import-dialog"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </dialog>
  );
}
