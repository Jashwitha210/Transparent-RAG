import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Send,
  Mic,
  MicOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [question, setQuestion] = useState("");

  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [backendOnline, setBackendOnline] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef(null);

  // --------------------------------------------------
  // BACKEND STATUS
  // --------------------------------------------------

  useEffect(() => {
    checkBackend();
    loadDocuments();

    const interval = setInterval(() => {
      checkBackend();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);

      if (response.ok) {
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  // --------------------------------------------------
  // LOAD DOCUMENTS FROM BACKEND
  // --------------------------------------------------

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setDocuments(
        Array.isArray(data.documents) ? data.documents : []
      );
    } catch (err) {
      console.error("Could not load documents:", err);
    }
  };

  // --------------------------------------------------
  // SELECT DOCUMENT
  // --------------------------------------------------

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    const allowedTypes = [".pdf", ".docx", ".txt"];

    if (!allowedTypes.includes(extension)) {
      setError("Only PDF, DOCX, and TXT files are supported.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError("");
    setSuccess("");
    setAnswer("");
    setEvidence([]);
  };

  // --------------------------------------------------
  // REMOVE SELECTED FILE
  // --------------------------------------------------

  const removeFile = () => {
    setFile(null);
    setError("");
    setSuccess("");
    setAnswer("");
    setEvidence([]);
  };

  // --------------------------------------------------
  // UPLOAD + INDEX DOCUMENT
  // --------------------------------------------------

  const uploadDocument = async () => {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    if (!backendOnline) {
      setError("Backend is offline. Start FastAPI first.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setAnswer("");
    setEvidence([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Document processing failed."
        );
      }

      setSuccess(
        `"${data.filename}" is ready. ${data.pages} page(s), ${data.chunks} chunk(s).`
      );

      await loadDocuments();
    } catch (err) {
      console.error("Upload error:", err);

      setError(
        err.message ||
          "Could not process the document."
      );
    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------
  // ASK QUESTION
  // --------------------------------------------------

  const askQuestion = async () => {
    const cleanQuestion = question.trim();

    if (!cleanQuestion) {
      setError("Please enter a question.");
      return;
    }

    if (!backendOnline) {
      setError("Backend is offline. Start FastAPI first.");
      return;
    }

    if (documents.length === 0) {
      setError(
        "Please upload and process a document before asking a question."
      );
      return;
    }

    setAsking(true);
    setError("");
    setSuccess("");
    setAnswer("");
    setEvidence([]);

    try {
      const params = new URLSearchParams({
        q: cleanQuestion,
        top_k: "5",
      });

      const response = await fetch(
        `${API_URL}/query?${params.toString()}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Question processing failed."
        );
      }

      setAnswer(
        data.answer ||
          "I couldn't find enough information in the uploaded documents."
      );

      setEvidence(
        Array.isArray(data.evidence)
          ? data.evidence
          : []
      );
    } catch (err) {
      console.error("Question error:", err);

      setError(
        err.message ||
          "Could not get an answer from the backend."
      );
    } finally {
      setAsking(false);
    }
  };

  // --------------------------------------------------
  // ENTER TO ASK
  // --------------------------------------------------

  const handleQuestionKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      askQuestion();
    }
  };

  // --------------------------------------------------
  // MICROPHONE → TEXT
  // --------------------------------------------------

  const toggleMicrophone = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Use Google Chrome."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setQuestion(transcript);
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setListening(false);

      setError(
        `Microphone error: ${event.error}`
      );
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error(
        "Could not start microphone:",
        err
      );

      setListening(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div>
          <h1>
            Transparent<span>-RAG</span>
          </h1>

          <p>
            Ask questions about your documents
          </p>
        </div>

        <div className="status">
          <span
            className={`status-dot ${
              backendOnline
                ? "online"
                : "offline"
            }`}
          />

          {backendOnline
            ? "Backend Connected"
            : "Backend Offline"}
        </div>
      </header>

      <main>

        {/* DOCUMENT UPLOAD */}

        <section className="card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                DOCUMENT
              </p>

              <h2>
                Upload a document
              </h2>

              <p>
                PDF, DOCX, or TXT
              </p>
            </div>
          </div>

          <label className="drop-zone">
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
            />

            <Upload size={42} />

            <h3>
              {file
                ? file.name
                : "Choose a document"}
            </h3>

            <p>
              Select a PDF, DOCX, or TXT file
            </p>
          </label>

          {file && (
            <div className="selected-file">
              <div className="file-info">
                <FileText size={28} />

                <div>
                  <strong>
                    {file.name}
                  </strong>

                  <small>
                    {(file.size / 1024).toFixed(1)} KB
                  </small>
                </div>
              </div>

              <div className="file-actions">
                <button
                  className="remove-button"
                  type="button"
                  onClick={removeFile}
                >
                  <Trash2 size={17} />
                  Remove
                </button>

                <button
                  className="primary-button"
                  type="button"
                  onClick={uploadDocument}
                  disabled={
                    uploading ||
                    !backendOnline
                  }
                >
                  {uploading ? (
                    <>
                      <Loader2
                        className="spin"
                        size={18}
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Process Document
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="message success">
              <CheckCircle size={20} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="message error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* CURRENT DOCUMENTS */}

        {documents.length > 0 && (
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  READY
                </p>

                <h2>
                  Your documents
                </h2>
              </div>
            </div>

            <div className="document-list">
              {documents.map((document) => (
                <div
                  className="document-item"
                  key={document.document_id}
                >
                  <FileText size={22} />

                  <div>
                    <strong>
                      {document.filename}
                    </strong>

                    <small>
                      {document.chunks} chunks
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* QUESTION */}

        <section className="card question-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                QUESTION
              </p>

              <h2>
                Ask your document
              </h2>
            </div>
          </div>

          <div className="question-box">
            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={
                handleQuestionKeyDown
              }
              placeholder="Type your question..."
              rows={4}
              disabled={
                !backendOnline ||
                documents.length === 0
              }
            />

            <div className="question-actions">

              <button
                className={`mic-button ${
                  listening
                    ? "listening"
                    : ""
                }`}
                type="button"
                onClick={toggleMicrophone}
                disabled={
                  !backendOnline ||
                  documents.length === 0 ||
                  asking
                }
                title={
                  listening
                    ? "Stop microphone"
                    : "Ask using microphone"
                }
              >
                {listening ? (
                  <MicOff size={22} />
                ) : (
                  <Mic size={22} />
                )}
              </button>

              <button
                className="primary-button ask-button"
                type="button"
                onClick={askQuestion}
                disabled={
                  asking ||
                  !backendOnline ||
                  documents.length === 0 ||
                  !question.trim()
                }
              >
                {asking ? (
                  <>
                    <Loader2
                      className="spin"
                      size={18}
                    />
                    Finding answer...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Ask
                  </>
                )}
              </button>
            </div>
          </div>

          {listening && (
            <div className="listening-message">
              <span className="recording-dot" />
              Listening... speak your question.
            </div>
          )}
        </section>

        {/* ANSWER */}

        {answer && (
          <section className="card answer-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  ANSWER
                </p>

                <h2>
                  Response
                </h2>
              </div>
            </div>

            <div className="answer-content">
              {answer}
            </div>
          </section>
        )}

        {/* EVIDENCE */}

        {evidence.length > 0 && (
          <section className="card evidence-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  EVIDENCE
                </p>

                <h2>
                  Supporting document content
                </h2>
              </div>
            </div>

            <div className="evidence-list">
              {evidence.map(
                (item, index) => (
                  <div
                    className="evidence-card"
                    key={`${item.source}-${item.chunk_index}-${index}`}
                  >
                    <div className="evidence-top">
                      <strong>
                        Evidence {index + 1}
                      </strong>

                      <span className="score">
                        Similarity:{" "}
                        {Number(
                          item.score
                        ).toFixed(4)}
                      </span>
                    </div>

                    <div className="evidence-meta">
                      <span>
                        <strong>
                          Source:
                        </strong>{" "}
                        {item.source ||
                          "Unknown"}
                      </span>

                      <span>
                        <strong>
                          Page:
                        </strong>{" "}
                        {item.page ??
                          "N/A"}
                      </span>

                      <span>
                        <strong>
                          Chunk:
                        </strong>{" "}
                        {item.chunk_index ??
                          "N/A"}
                      </span>
                    </div>

                    <p>
                      {item.text}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

export default App;