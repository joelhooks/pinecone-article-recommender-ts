import { PineconeClient } from "@pinecone-database/pinecone"
import { config } from "dotenv"
import { getEnv, validateEnviromentVariables } from "./util"

config()

let pineconeClient: PineconeClient | null = null

export async function getPineconeClient() {
  validateEnviromentVariables()
  if(pineconeClient) {
    return pineconeClient
  }

  pineconeClient = new PineconeClient()

  await pineconeClient.init({
    apiKey: getEnv("PINECONE_API_KEY"),
    environment: getEnv("PINECONE_ENVIRONMENT")
  })

  return pineconeClient
}
