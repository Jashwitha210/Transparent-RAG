import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Database,
  Brain,
  ShieldCheck,
} from "lucide-react";

import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  // -----------------------------
  // Document state
  // -----------------------------
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // -----------------------------
  // Question / answer state
  // -----------------------------
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [asking, setAsking] = useState(false);

  // -----------------------------
  // Application state
  // -----------------------------
  const [error, setError] = useState("");
  const [backendOnline, setBackendOnline] = useState(false);

  // -----------------------------
  // Voice state
  // -----------------------------
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);

  // ============================================================
  // BACKEND HEALTH CHECK
  // ============================================================

  useEffect(() => {
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

    checkBackend();

    const interval = setInterval(checkBackend, 10000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // FILE HANDLING
  // ============================================================

  const isSupportedFile = (selectedFile) => {
    const fileName = selectedFile.name.toLowerCase();

    return (
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".docx")
    );
  };

  const selectFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    if (!isSupportedFile(selectedFile)) {
      setError(
        "Unsupported file type. Please upload a PDF, DOCX, or TXT file."
      );
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setUploadResult(null);
    setAnswer("");
    setEvidence([]);
    setError("");
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    selectFile(selectedFile);

    // Allow selecting the same file again later.
    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.classList.add("drag-active");
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.classList.remove("drag-active");
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.classList.remove("drag-active");

    const droppedFile = event.dataTransfer.files?.[0];

    selectFile(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setUploadResult(null);
    setError("");
  };

  // ============================================================
  // UPLOAD DOCUMENT
  // ============================================================

  const uploadDocument = async () => {
    if (!file) {
      setError("Please select or drag a document first.");
      return;
    }

    if (!backendOnline) {
      setError(
        "Backend is offline. Please make sure FastAPI is running on port 8000."
      );
      return;
    }

    setUploading(true);
    setError("");
    setUploadResult(null);

    const formData = new FormData();

    formData.append("file", file);

    try {
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
          data.detail || "Document upload failed."
        );
      }

      setUploadResult(data);
    } catch (err) {
      setError(
        err.message ||
          "Could not upload the document."
      );
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // SPEECH TO TEXT
  // ============================================================

  const toggleMicrophone = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    setError("");

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setQuestion(transcript);
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "not-allowed") {
        setError(
          "Microphone permission was denied. Please allow microphone access in Chrome."
        );
      } else if (event.error === "no-speech") {
        setError(
          "No speech was detected. Please try again."
        );
      } else {
        setError(
          `Microphone error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  // ============================================================
  // ASK QUESTION
  // ============================================================

  const askQuestion = async () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    if (!backendOnline) {
      setError(
        "Backend is offline. Please start the FastAPI server."
      );
      return;
    }

    setAsking(true);
    setError("");
    setAnswer("");
    setEvidence([]);

    try {
      const response = await fetch(
        `${API_URL}/query?q=${encodeURIComponent(
          question.trim()
        )}&top_k=5`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Question request failed."
        );
      }

      setAnswer(data.answer || "");
      setEvidence(data.evidence || []);
    } catch (err) {
      setError(
        err.message ||
          "Could not get an answer from the backend."
      );
    } finally {
      setAsking(false);
    }
  };

  const handleQuestionKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      askQuestion();
    }
  };

  // ============================================================
  // TEXT TO SPEECH
  // ============================================================

  const speakAnswer = () => {
    if (!answer) {
      return;
    }

    if (!window.speechSynthesis) {
      setError(
        "Text-to-speech is not supported in this browser."
      );
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance =
      new SpeechSynthesisUtterance(answer);

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
    };

    utterance.onerror = () => {
      setSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="app">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <header className="header">

        <div className="brand">

          <div className="brand-icon">
            <Brain size={24} />
          </div>

          <div>
            <h1>
              Transparent<span>-RAG</span>
            </h1>

            <p>
              Explainable Document Intelligence
            </p>
          </div>

        </div>

        <div
          className={`status ${
            backendOnline
              ? "status-online"
              : "status-offline"
          }`}
        >
          <span className="status-dot" />

          {backendOnline
            ? "Backend Connected"
            : "Backend Offline"}
        </div>

      </header>

      <main>

        {/* ==================================================
            HERO
        =================================================== */}

        <section className="hero">

          <div className="hero-badge">
            <ShieldCheck size={16} />

            Transparent AI
          </div>

          <p className="eyebrow">
            DOCUMENT INTELLIGENCE
          </p>

          <h2>
            Ask your documents.
            <br />

            <span>
              Understand the source.
            </span>
          </h2>

          <p className="hero-description">
            Upload your documents, ask natural-language
            questions, and receive answers backed by
            transparent evidence from your files.
          </p>

        </section>

        {/* ==================================================
            UPLOAD
        =================================================== */}

        <section className="card upload-card">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                STEP 01
              </p>

              <h3>
                Upload your document
              </h3>

              <p>
                Add a PDF, DOCX, or TXT file to
                start building your document knowledge base.
              </p>

            </div>

          </div>

          {/* DRAG AND DROP AREA */}

          <div
            className="drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >

            <input
              id="document-input"
              className="hidden-file-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.txt,.docx"
            />

            <div className="upload-icon">
              <Upload size={30} />
            </div>

            <h4>
              {file
                ? file.name
                : "Drag & drop your document here"}
            </h4>

            <p>
              {file
                ? "Document selected successfully"
                : "Drag a file from File Explorer and drop it here"}
            </p>

            <span className="supported-files">
              PDF · DOCX · TXT
            </span>

            {!file && (
              <label
                htmlFor="document-input"
                className="choose-button"
              >
                Choose File
              </label>
            )}

          </div>

          {/* SELECTED FILE */}

          {file && (
            <div className="selected-file">

              <div className="selected-file-info">

                <div className="file-icon">
                  <FileText size={20} />
                </div>

                <div>
                  <strong>
                    {file.name}
                  </strong>

                  <small>
                    {(file.size / 1024).toFixed(1)} KB
                  </small>
                </div>

              </div>

              <div className="selected-file-actions">

                <button
                  className="secondary-button"
                  onClick={clearFile}
                  disabled={uploading}
                >
                  Remove
                </button>

                <button
                  className="primary-button"
                  onClick={uploadDocument}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin"
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

          {/* ERROR */}

          {error && (
            <div className="message error">

              <AlertCircle size={19} />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* SUCCESS */}

          {uploadResult && (
            <div className="message success">

              <div className="success-title">

                <CheckCircle size={20} />

                <strong>
                  Document processed successfully
                </strong>

              </div>

              <div className="result-grid">

                <div>
                  <span>File</span>

                  <strong>
                    {uploadResult.filename}
                  </strong>
                </div>

                <div>
                  <span>Type</span>

                  <strong>
                    {uploadResult.file_type}
                  </strong>
                </div>

                <div>
                  <span>Pages</span>

                  <strong>
                    {uploadResult.pages}
                  </strong>
                </div>

                <div>
                  <span>Chunks</span>

                  <strong>
                    {uploadResult.chunks}
                  </strong>
                </div>

              </div>

            </div>
          )}

        </section>

        {/* ==================================================
            QUESTION / SEARCH
        =================================================== */}

        <section className="card question-card">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                STEP 02
              </p>

              <h3>
                Ask your documents
              </h3>

              <p>
                Enter a question or use the microphone
                to ask your documents naturally.
              </p>

            </div>

          </div>

          <div className="question-box">

            <textarea
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              onKeyDown={handleQuestionKeyDown}
              placeholder="Ask something about your uploaded documents..."
              rows={4}
              disabled={asking}
            />

            <div className="question-toolbar">

              <div className="question-hint">
                <Search size={15} />

                Press Enter to ask
              </div>

              <div className="question-actions">

                {/* MICROPHONE */}

                <button
                  className={`mic-button ${
                    listening
                      ? "listening"
                      : ""
                  }`}
                  onClick={toggleMicrophone}
                  type="button"
                  title={
                    listening
                      ? "Stop recording"
                      : "Speak your question"
                  }
                >

                  {listening ? (
                    <MicOff size={21} />
                  ) : (
                    <Mic size={21} />
                  )}

                </button>

                {/* ASK */}

                <button
                  className="ask-button"
                  onClick={askQuestion}
                  disabled={
                    asking ||
                    !question.trim()
                  }
                  type="button"
                >

                  {asking ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin"
                      />

                      Searching...
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

          </div>

          {listening && (
            <div className="listening-message">

              <span className="recording-dot" />

              Listening... speak your question.

            </div>
          )}

        </section>

        {/* ==================================================
            ANSWER
        =================================================== */}

        {(answer || asking) && (
          <section className="card answer-card">

            <div className="answer-header">

              <div>

                <p className="eyebrow">
                  STEP 03
                </p>

                <h3>
                  AI Answer
                </h3>

              </div>

              {answer && (
                <button
                  className="speech-button"
                  onClick={speakAnswer}
                  type="button"
                >

                  {speaking ? (
                    <VolumeX size={19} />
                  ) : (
                    <Volume2 size={19} />
                  )}

                  {speaking
                    ? "Stop"
                    : "Read aloud"}

                </button>
              )}

            </div>

            {asking ? (
              <div className="loading-answer">

                <Loader2
                  size={25}
                  className="spin"
                />

                <div>
                  <strong>
                    Searching your documents...
                  </strong>

                  <span>
                    Retrieving relevant evidence and
                    generating a transparent answer.
                  </span>
                </div>

              </div>
            ) : (
              <div className="answer-content">
                {answer}
              </div>
            )}

          </section>
        )}

        {/* ==================================================
            EVIDENCE
        =================================================== */}

        {evidence.length > 0 && (
          <section className="evidence-section">

            <div className="section-heading">

              <div>

                <p className="eyebrow">
                  STEP 04
                </p>

                <h3>
                  Supporting Evidence
                </h3>

                <p>
                  These document chunks were retrieved
                  to support the generated answer.
                </p>

              </div>

              <div className="evidence-count">

                <Database size={17} />

                {evidence.length} sources

              </div>

            </div>

            <div className="evidence-list">

              {evidence.map((item, index) => (

                <div
                  className="evidence-card"
                  key={`${item.source}-${item.chunk_index}-${index}`}
                >

                  <div className="evidence-top">

                    <span className="evidence-number">
                      Evidence {index + 1}
                    </span>

                    <span className="score">
                      Relevance:{" "}
                      {Number(
                        item.score
                      ).toFixed(4)}
                    </span>

                  </div>

                  <div className="evidence-source">

                    <FileText size={18} />

                    <strong>
                      {item.source}
                    </strong>

                    {item.page !== null &&
                      item.page !== undefined && (
                        <span>
                          Page {item.page}
                        </span>
                      )}

                    <span>
                      Chunk {item.chunk_index}
                    </span>

                  </div>

                  <p className="evidence-text">
                    {item.text}
                  </p>

                </div>

              ))}

            </div>

          </section>
        )}

        {/* ==================================================
            PIPELINE
        =================================================== */}

        <section className="pipeline">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                TRANSPARENT PIPELINE
              </p>

              <h3>
                How Transparent-RAG works
              </h3>

              <p>
                Every question passes through an
                explainable retrieval pipeline.
              </p>

            </div>

          </div>

          <div className="pipeline-grid">

            <div className="pipeline-step">

              <span>01</span>

              <h4>
                Upload
              </h4>

              <p>
                Add your PDF, DOCX, or TXT document.
              </p>

            </div>

            <div className="pipeline-step">

              <span>02</span>

              <h4>
                Extract
              </h4>

              <p>
                Extract readable text and metadata.
              </p>

            </div>

            <div className="pipeline-step">

              <span>03</span>

              <h4>
                Chunk
              </h4>

              <p>
                Divide the content into searchable chunks.
              </p>

            </div>

            <div className="pipeline-step">

              <span>04</span>

              <h4>
                Retrieve
              </h4>

              <p>
                Find the most relevant evidence using embeddings.
              </p>

            </div>

            <div className="pipeline-step">

              <span>05</span>

              <h4>
                Explain
              </h4>

              <p>
                Generate an answer with supporting evidence.
              </p>

            </div>

          </div>

        </section>

      </main>

      {/* ======================================================
          FOOTER
      ======================================================= */}

      <footer>

        <div>
          <Brain size={17} />

          Transparent-RAG
        </div>

        <span>
          Explainable Document Intelligence
        </span>

      </footer>

    </div>
  );
}

export default App;