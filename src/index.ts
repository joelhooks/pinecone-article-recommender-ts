import * as dotenv from "dotenv"
import cliProgress from "cli-progress"
import { splitFile } from "./utils/splitfile"
import { loadCSV } from "./utils/load-csv"
import * as dfd from 'danfojs-node'
import { Vector, utils } from '@pinecone-database/pinecone';
import { getEnv } from "./utils/util"
import { getPineconeClient } from "./utils/pinecone"
import { Document } from 'langchain/document';
import { embedder } from "./embeddings"

type ArticleRecord = {
  index: number
  title: string
  article: string
  publication: string
  url: string
  author: string
  section: string
}


dotenv.config()
const { createIndexIfNotExists, chunkedUpsert } = utils;

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

const indexName = getEnv("PINECONE_INDEX");
const pineconeClient = await getPineconeClient();

// what do these dimensions mean in pinecone?
const PINECONE_INDEX_DIMENSION = 384

async function getChunk(dataFrame: dfd.DataFrame, start: number, size: number): Promise<dfd.DataFrame> {
  return await dataFrame.head(start + size).tail(size)
}

// a generator with generic typing 😭
async function* processInChunks<T, M extends keyof T, P extends keyof T>(
  dataFrame: dfd.DataFrame,
  chunkSize: number,
  metadataFields: M[],
  pageContentField: P
) {
  for(let i = 0; i < dataFrame.shape[0]; i += chunkSize) {
    const chunk = await getChunk(dataFrame, i, chunkSize)
    const records = dfd.toJSON(chunk) as T[]
    yield records.map((record: T) => {
      const metadata: Partial<Record<M, T[M]>> = {}
      for(const field of metadataFields) {
        metadata[field] = record[field]
      }
      return new Document({
        pageContent: record[pageContentField] as string,
        metadata
      })
    })
  }
}

async function embedAndUpsert(dataFrame: dfd.DataFrame, chunkSize: number) {
  const chunkGenerator = processInChunks<ArticleRecord, 'section' | 'url' | 'title' | 'publication' | 'author' | 'article', 'article'>(
    dataFrame,
    chunkSize,
    ['section', 'url', 'title', 'publication', 'author', 'article'],
    'article'
  )
  const index = pineconeClient.Index(indexName)
  for await (const documents of chunkGenerator) {
    await embedder.embedBatch(documents, chunkSize, async (embeddings: Vector[]) => {
      await chunkedUpsert(index, embeddings, 'default')
      progressBar.increment(embeddings.length)
    })
  }
}

try {
  const fileParts = await splitFile('./data/all-the-news-2-1.csv', 500000)
  const firstFile = fileParts[0]

  const data = await loadCSV(firstFile)
  // remove missing values in dataframe
  // https://danfo.jsdata.org/api-reference/dataframe/danfo.dataframe.dropna
  const clean = data.dropNa() as dfd.DataFrame

  // return the first N rows of the dataframe (and print to console)
  // https://danfo.jsdata.org/api-reference/dataframe/danfo.dataframe.head
  // Pretty prints default (10) number of rows in a DataFrame or Series to the console
  // https://danfo.jsdata.org/api-reference/dataframe/dataframe.print
  clean.head().print()


  // check pinecone for an existing index and make it if it isn't there
  await createIndexIfNotExists(pineconeClient, indexName, PINECONE_INDEX_DIMENSION)
  
  // https://danfo.jsdata.org/api-reference/dataframe/dataframe.shape
  progressBar.start(clean.shape[0], 0)
  // what are the differences between specific models?
  await embedder.init('Xenova/all-MiniLM-L6-v2')

  await embedAndUpsert(clean, 10)

  progressBar.stop()
  console.log(`Inserted ${progressBar.getTotal()} embeddings into index ${indexName}`)
} catch (error) {
  console.log(error)
}