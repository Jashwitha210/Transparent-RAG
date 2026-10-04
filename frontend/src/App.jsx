import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);
    setError("");
  };

  const uploadDocument = async () => {
    if (!file) {
      setError("Please select a document first.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_URL}/api/documents/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Upload failed."
        );
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>Transparent<span>-RAG</span></h1>
          <p>Explainable Document Intelligence</p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Backend Connected
        </div>
      </header>


      <main>

        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              DOCUMENT INTELLIGENCE
            </p>

            <h2>
              Ask your documents.
              <br />
              <span>Understand the source.</span>
            </h2>

            <p className="hero-description">
              Upload documents and let Transparent-RAG
              extract, process and retrieve information
              with transparent source references.
            </p>
          </div>
        </section>


        <section className="upload-card">

          <div className="section-heading">
            <div>
              <h3>Upload Documents</h3>
              <p>
                Add a document to begin analysis.
              </p>
            </div>
          </div>

          <label className="drop-zone">

            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.txt,.docx,.pptx,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
            />

            <div className="upload-icon">
              ↑
            </div>

            <h4>
              {file
                ? file.name
                : "Choose a document"}
            </h4>

            <p>
              PDF · DOCX · PPTX · XLSX · XLS · CSV
              · TXT · PNG · JPG
            </p>

          </label>


          {file && (
            <div className="selected-file">

              <div>
                <strong>{file.name}</strong>
                <small>
                  {(file.size / 1024).toFixed(1)} KB
                </small>
              </div>

              <button
                onClick={uploadDocument}
                disabled={uploading}
              >
                {uploading
                  ? "Processing..."
                  : "Process Document"}
              </button>

            </div>
          )}


          {error && (
            <div className="message error">
              {error}
            </div>
          )}


          {result && (
            <div className="message success">

              <strong>
                Document processed successfully
              </strong>

              <div className="result-grid">

                <div>
                  <span>File</span>
                  <strong>{result.filename}</strong>
                </div>

                <div>
                  <span>Type</span>
                  <strong>{result.extension}</strong>
                </div>

                <div>
                  <span>Pages</span>
                  <strong>{result.pages}</strong>
                </div>

                <div>
                  <span>Chunks</span>
                  <strong>{result.chunks}</strong>
                </div>

              </div>

            </div>
          )}

        </section>


        <section className="pipeline">

          <div className="section-heading">
            <div>
              <h3>How Transparent-RAG Works</h3>
              <p>
                Your document moves through an explainable
                processing pipeline.
              </p>
            </div>
          </div>

          <div className="pipeline-grid">

            <div className="pipeline-step">
              <span>01</span>
              <h4>Upload</h4>
              <p>
                Add your document to the system.
              </p>
            </div>

            <div className="pipeline-step">
              <span>02</span>
              <h4>Extract</h4>
              <p>
                Text and document information are extracted.
              </p>
            </div>

            <div className="pipeline-step">
              <span>03</span>
              <h4>Chunk</h4>
              <p>
                Content is divided into searchable sections.
              </p>
            </div>

            <div className="pipeline-step">
              <span>04</span>
              <h4>Retrieve</h4>
              <p>
                Relevant information is retrieved for your query.
              </p>
            </div>

            <div className="pipeline-step">
              <span>05</span>
              <h4>Explain</h4>
              <p>
                Answers will show their supporting sources.
              </p>
            </div>

          </div>

        </section>


        <section className="coming-soon">

          <p className="eyebrow">
            NEXT LAYER
          </p>

          <h3>
            Ask questions about your documents.
          </h3>

          <p>
            The RAG query interface will appear here
            once retrieval and vector search are connected.
          </p>

        </section>

      </main>


      <footer>
        <p>
          Transparent-RAG · Explainable Multi-Agent RAG System
        </p>
      </footer>

    </div>
  );
}

export default App;