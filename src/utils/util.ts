import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export function sliceIntoChunks<T>(array: T[], chunkSize: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, index) => {
    const start = index * chunkSize
    return array.slice(start, (index + 1) * chunkSize)
  })
}

export function getEnv(key:string) {
  const value = process.env[key]
  if(!value) {
    throw new Error(`Environment variable ${key} is not defined`)
  }
  return value
}

export function validateEnviromentVariables() {
  getEnv("PINECONE_API_KEY")
  getEnv("PINECONE_ENVIRONMENT")
  getEnv("PINECONE_INDEX")
}