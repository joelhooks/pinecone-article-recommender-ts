import fs, { read } from "fs"
import readline from "readline"

// split a large csv file into smaller files with configurable number of lines using a function that returns a promise
export async function splitFile(filepath: string, numLinesPerPart: number): Promise<string[]> {
  const filestream = fs.createReadStream(filepath)
  const rl = readline.createInterface({
    input: filestream,
    crlfDelay: Infinity
  })

  let partIndex = 1
  let lineIndex = 0
  let writeStream = fs.createWriteStream(`${filepath}.${partIndex}`)
  const createdFiles = [`${filepath}.${partIndex}`]

  for await (const line of rl) {
    if(lineIndex === numLinesPerPart) {
      writeStream.end()
      partIndex++
      lineIndex = 0
      writeStream = fs.createWriteStream(`${filepath}.${partIndex}`)
      createdFiles.push(`${filepath}.${partIndex}`)
    }
    writeStream.write(`${line}\n`)
    lineIndex++
  }

  if(!writeStream.closed) {
    writeStream.end()
  }

  return createdFiles
}