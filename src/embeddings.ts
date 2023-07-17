import { randomUUID } from "crypto"
import { type Pipeline, pipeline, AutoConfig } from "@xenova/transformers"
import { type Vector } from "@pinecone-database/pinecone"
import { type Document } from "langchain/document"
import { type EmbeddingsParams, type Embeddings } from "langchain/embeddings/base"
import { sliceIntoChunks } from "./utils/util"

type DocumentOrString = Document | string

function isString(value: any): value is string {
  return typeof value === "string"
}

class Embedder {
  private pipe: Pipeline

  async init(modelName: string) {
    const config = await AutoConfig.from_pretrained(modelName)
    this.pipe = await pipeline(
      'embeddings',
      modelName,
      {
        quantized: false,
        config
      }
    )
  }

  // embeds a text and returns the embedding
  async embed(text: string, metadata?: Record<string, unknown>): Promise<Vector> {
   try {
    const result = await this.pipe(text, { pooling: 'mean', normmalize: true })
    const id = (metadata?.id ?? randomUUID()) as string
    return {
      id,
      metadata: metadata || {text},
      values: Array.from(result.data) as number[]
    }
   } catch (error) {
    console.log(`Error embedding text: ${text}, ${error}`)
    throw error
   }
  }

  async embedBatch(documents: DocumentOrString[], batchSize: number, onDoneBatch: (embeddings: Vector[]) => void) {
    const batches = sliceIntoChunks<DocumentOrString>(documents, batchSize)
    for(const batch of batches) {
      const embeddings = await Promise.all(
        batch.map((documentOrString) => 
          isString(documentOrString) 
            ? this.embed(documentOrString) 
            : this.embed(documentOrString.pageContent, documentOrString.metadata)
            )
      )
      await onDoneBatch(embeddings)
    }
  }
}

export const embedder = new Embedder()
