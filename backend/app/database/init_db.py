from app.database.database import get_connection


def initialize_database():
    connection = get_connection()

    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            status TEXT NOT NULL,
            page_count INTEGER DEFAULT 0,
            chunk_count INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id TEXT NOT NULL,
            chunk_number INTEGER NOT NULL,
            text TEXT NOT NULL,
            page TEXT,
            source_type TEXT,
            start_char INTEGER,
            end_char INTEGER,
            embedding TEXT,
            FOREIGN KEY (document_id)
                REFERENCES documents(id)
                ON DELETE CASCADE
        );
        """
    )

    connection.commit()
    connection.close()


if __name__ == "__main__":
    initialize_database()
    print("Database initialized successfully.")