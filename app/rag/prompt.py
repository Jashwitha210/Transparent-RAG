def build_rag_prompt(question: str, contexts: list[dict]) -> str:
    context_text = "\n\n".join(
        [
            (
                f"[Evidence {index}]\n"
                f"Source: {item['source']}\n"
                f"Page: {item['page']}\n"
                f"Relevance: {item['score']:.4f}\n"
                f"Content:\n{item['text']}"
            )
            for index, item in enumerate(contexts, start=1)
        ]
    )

    return f"""
You are a transparent document question-answering assistant.

Answer the user's question ONLY using the evidence below.

If the evidence does not contain enough information to answer the question,
say exactly:

"I couldn't find enough information in the uploaded documents."

Do not invent facts.
Do not use outside knowledge.

User question:
{question}

Evidence:
{context_text}

Instructions:
1. Give a concise answer.
2. Cite the evidence numbers used, such as [Evidence 1].
3. Do not cite evidence that does not support your answer.
""".strip()