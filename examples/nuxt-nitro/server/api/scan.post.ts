import { readMultipartFormData } from 'h3'
import { scanFile } from 'pompelmi'
import { writeFile, rm, mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

// Maximum file size: 25 MB (adjust based on your needs)
const MAX_FILE_SIZE = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  let tempDir: string | null = null
  
  try {
    // Parse multipart form data
    const formData = await readMultipartFormData(event)
    
    if (!formData) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded'
      })
    }

    // Find the file field
    const fileField = formData.find(field => field.name === 'file')
    
    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: 'File field is required'
      })
    }

    // Enforce file size limit
    if (fileField.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 413,
        message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024} MB`
      })
    }

    // Create unique temp directory
    tempDir = join(tmpdir(), `pompelmi-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    await mkdir(tempDir, { recursive: true })

    // Write uploaded file to temp location
    const tempFilePath = join(tempDir, fileField.filename || 'upload')
    await writeFile(tempFilePath, fileField.data)

    // Scan the file
    const scanResult = await scanFile(tempFilePath)

    // Return verdict and full scan result
    return {
      ok: true,
      verdict: scanResult.verdict,
      scan: scanResult
    }

  } catch (error: any) {
    console.error('Scan error:', error)
    
    // Handle known errors
    if (error.statusCode) {
      throw error
    }
    
    // Generic error response (don't leak internal paths)
    throw createError({
      statusCode: 500,
      message: 'Internal server error during file scan'
    })
    
  } finally {
    // Always clean up temp files
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error('Failed to clean up temp directory:', cleanupError)
      }
    }
  }
})
