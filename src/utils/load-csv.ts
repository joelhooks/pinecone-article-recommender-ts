import fs from "fs/promises"
import * as dfd from 'danfojs-node'

export async function loadCSV(filepath: string): Promise<dfd.DataFrame> {
  try {
    const csvAbsolutePath = await fs.realpath(filepath)
    return await dfd.readCSV(csvAbsolutePath) as dfd.DataFrame
  } catch (error) {
    console.log(error)
    throw error
  }
}