/**
 * Enterprise-grade atomic file operations with backup and recovery
 * Prevents data corruption and provides automatic recovery mechanisms
 */

const fs = require('fs').promises
const fsSync = require('fs')
const path = require('path')
const crypto = require('crypto')

/**
 * Configuration for file operations
 */
const FILE_CONFIG = {
  BACKUP_COUNT: 5, // Number of backup files to maintain
  TEMP_SUFFIX: '.tmp',
  BACKUP_SUFFIX: '.backup',
  LOCK_SUFFIX: '.lock',
  CHECKSUM_SUFFIX: '.checksum',
  WRITE_TIMEOUT: 30000, // 30 seconds
  LOCK_TIMEOUT: process.env.NODE_ENV === 'development' ? 2000 : 10000, // 2s dev, 10s prod
  MAX_RETRIES: 3,       // Maximum retry attempts for locks
  RETRY_DELAY: 200      // Base delay between retries (ms)
}

/**
 * Generate SHA-256 checksum for data integrity verification
 */
const generateChecksum = (data) => {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex')
}

/**
 * Verify data integrity using checksum
 */
const verifyChecksum = async (filePath) => {
  try {
    const checksumPath = filePath + FILE_CONFIG.CHECKSUM_SUFFIX
    const [data, savedChecksum] = await Promise.all([
      fs.readFile(filePath, 'utf8'),
      fs.readFile(checksumPath, 'utf8').catch(() => null)
    ])

    if (!savedChecksum) return { valid: false, reason: 'No checksum file' }

    const actualChecksum = generateChecksum(data)
    return {
      valid: actualChecksum === savedChecksum.trim(),
      reason: actualChecksum === savedChecksum.trim() ? 'Valid' : 'Checksum mismatch'
    }
  } catch (error) {
    return { valid: false, reason: error.message }
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create a file lock to prevent concurrent writes with retry mechanism
 */
const createLock = async (filePath, retryCount = 0) => {
  const lockPath = filePath + FILE_CONFIG.LOCK_SUFFIX
  const lockData = {
    pid: process.pid,
    timestamp: Date.now(),
    hostname: require('os').hostname()
  }

  try {
    // Check if lock already exists
    if (fsSync.existsSync(lockPath)) {
      const existingLock = JSON.parse(await fs.readFile(lockPath, 'utf8'))
      const lockAge = Date.now() - existingLock.timestamp

      // Remove stale locks (older than timeout)
      if (lockAge > FILE_CONFIG.LOCK_TIMEOUT) {
        await fs.unlink(lockPath).catch(() => {})
      } else {
        // Retry logic for development environment
        if (retryCount < FILE_CONFIG.MAX_RETRIES && process.env.NODE_ENV === 'development') {
          const delay = FILE_CONFIG.RETRY_DELAY * Math.pow(2, retryCount) // Exponential backoff
          console.log(`🔄 Lock retry ${retryCount + 1}/${FILE_CONFIG.MAX_RETRIES} for ${filePath}, waiting ${delay}ms`)
          await sleep(delay)
          return createLock(filePath, retryCount + 1)
        }
        throw new Error(`File is locked by PID ${existingLock.pid} on ${existingLock.hostname}`)
      }
    }

    // Create new lock
    await fs.writeFile(lockPath, JSON.stringify(lockData), { flag: 'wx' })
    return lockPath
  } catch (error) {
    if (error.code === 'EEXIST') {
      // Retry logic for EEXIST errors too
      if (retryCount < FILE_CONFIG.MAX_RETRIES && process.env.NODE_ENV === 'development') {
        const delay = FILE_CONFIG.RETRY_DELAY * Math.pow(2, retryCount)
        console.log(`🔄 Lock retry ${retryCount + 1}/${FILE_CONFIG.MAX_RETRIES} for ${filePath} (EEXIST), waiting ${delay}ms`)
        await sleep(delay)
        return createLock(filePath, retryCount + 1)
      }
      throw new Error('File is currently locked by another process')
    }
    throw error
  }
}

/**
 * Release a file lock
 */
const releaseLock = async (lockPath) => {
  try {
    await fs.unlink(lockPath)
  } catch (error) {
    // Lock file might have been removed already - this is okay
    console.warn('Warning: Could not remove lock file:', error.message)
  }
}

/**
 * Create a backup of the current file
 */
const createBackup = async (filePath) => {
  try {
    if (!fsSync.existsSync(filePath)) return null

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${filePath}${FILE_CONFIG.BACKUP_SUFFIX}.${timestamp}`

    await fs.copyFile(filePath, backupPath)
    return backupPath
  } catch (error) {
    console.error('Failed to create backup:', error.message)
    return null
  }
}

/**
 * Clean up old backup files, keeping only the most recent ones
 */
const cleanupBackups = async (filePath) => {
  try {
    const dir = path.dirname(filePath)
    const baseName = path.basename(filePath)
    const files = await fs.readdir(dir)

    const backupFiles = files
      .filter(file => file.startsWith(`${baseName}${FILE_CONFIG.BACKUP_SUFFIX}`))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        mtime: fsSync.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime) // Sort by modification time, newest first

    // Remove old backups beyond the configured count
    const filesToRemove = backupFiles.slice(FILE_CONFIG.BACKUP_COUNT)
    await Promise.all(
      filesToRemove.map(file => fs.unlink(file.path).catch(() => {}))
    )
  } catch (error) {
    console.error('Failed to cleanup backups:', error.message)
  }
}

/**
 * Atomic write operation with backup and integrity checking
 */
const atomicWrite = async (filePath, data) => {
  const tempPath = filePath + FILE_CONFIG.TEMP_SUFFIX
  const checksumPath = filePath + FILE_CONFIG.CHECKSUM_SUFFIX
  let lockPath = null

  try {
    // Step 1: Acquire exclusive lock
    lockPath = await createLock(filePath)

    // Step 2: Create backup of existing file
    const backupPath = await createBackup(filePath)

    // Step 3: Write to temporary file
    const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await fs.writeFile(tempPath, dataString, 'utf8')

    // Step 4: Generate and save checksum
    const checksum = generateChecksum(dataString)
    await fs.writeFile(checksumPath + FILE_CONFIG.TEMP_SUFFIX, checksum, 'utf8')

    // Step 5: Atomic move - this is the critical operation
    await Promise.all([
      fs.rename(tempPath, filePath),
      fs.rename(checksumPath + FILE_CONFIG.TEMP_SUFFIX, checksumPath)
    ])

    // Step 6: Verify the written data
    const verification = await verifyChecksum(filePath)
    if (!verification.valid) {
      throw new Error(`Data integrity check failed: ${verification.reason}`)
    }

    // Step 7: Cleanup old backups
    await cleanupBackups(filePath)

    console.log(`✅ Atomic write successful for ${filePath}`)
    return true

  } catch (error) {
    console.error(`❌ Atomic write failed for ${filePath}:`, error.message)

    // Cleanup temporary files on failure
    await Promise.all([
      fs.unlink(tempPath).catch(() => {}),
      fs.unlink(checksumPath + FILE_CONFIG.TEMP_SUFFIX).catch(() => {})
    ])

    throw error
  } finally {
    // Always release the lock
    if (lockPath) {
      await releaseLock(lockPath)
    }
  }
}

/**
 * Safe read operation with integrity verification
 */
const safeRead = async (filePath) => {
  try {
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      return null
    }

    // Verify data integrity
    const verification = await verifyChecksum(filePath)
    if (!verification.valid) {
      console.warn(`⚠️ Data integrity check failed for ${filePath}: ${verification.reason}`)

      // Attempt recovery from backup
      const recoveredData = await recoverFromBackup(filePath)
      if (recoveredData !== null) {
        console.log(`✅ Successfully recovered data from backup for ${filePath}`)
        return recoveredData
      }

      console.error(`❌ Could not recover data for ${filePath}`)
      throw new Error(`Data corruption detected and recovery failed: ${verification.reason}`)
    }

    // Read and parse the file
    const data = await fs.readFile(filePath, 'utf8')

    try {
      return JSON.parse(data)
    } catch (parseError) {
      // If JSON parsing fails, return raw string
      return data
    }

  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message)

    // Attempt recovery from backup
    const recoveredData = await recoverFromBackup(filePath)
    if (recoveredData !== null) {
      console.log(`✅ Successfully recovered data from backup for ${filePath}`)
      return recoveredData
    }

    throw error
  }
}

/**
 * Recover data from the most recent valid backup
 */
const recoverFromBackup = async (filePath) => {
  try {
    const dir = path.dirname(filePath)
    const baseName = path.basename(filePath)
    const files = await fs.readdir(dir)

    const backupFiles = files
      .filter(file => file.startsWith(`${baseName}${FILE_CONFIG.BACKUP_SUFFIX}`))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        mtime: fsSync.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime) // Sort by modification time, newest first

    // Try each backup file until we find a valid one
    for (const backup of backupFiles) {
      try {
        const data = await fs.readFile(backup.path, 'utf8')
        const parsed = JSON.parse(data)

        // Restore the backup to main file
        await atomicWrite(filePath, parsed)

        console.log(`✅ Successfully restored from backup: ${backup.name}`)
        return parsed
      } catch (error) {
        console.warn(`⚠️ Backup file ${backup.name} is also corrupted:`, error.message)
        continue
      }
    }

    return null
  } catch (error) {
    console.error('Error during backup recovery:', error.message)
    return null
  }
}

/**
 * Initialize file with default data if it doesn't exist
 */
const initializeFile = async (filePath, defaultData = []) => {
  try {
    if (!fsSync.existsSync(filePath)) {
      console.log(`📄 Initializing new file: ${filePath}`)
      await atomicWrite(filePath, defaultData)
      return defaultData
    }

    return await safeRead(filePath)
  } catch (error) {
    console.error(`Failed to initialize file ${filePath}:`, error.message)

    // If all else fails, create with default data
    try {
      await atomicWrite(filePath, defaultData)
      return defaultData
    } catch (initError) {
      console.error(`Critical error: Cannot initialize file ${filePath}:`, initError.message)
      throw initError
    }
  }
}

/**
 * Get file health status and metrics
 */
const getFileHealth = async (filePath) => {
  try {
    const stats = {
      exists: fsSync.existsSync(filePath),
      readable: false,
      integrity: { valid: false, reason: 'File does not exist' },
      backupCount: 0,
      lastModified: null,
      size: 0
    }

    if (!stats.exists) {
      return stats
    }

    try {
      const fileStats = await fs.stat(filePath)
      stats.lastModified = fileStats.mtime
      stats.size = fileStats.size
      stats.readable = true
    } catch (error) {
      stats.readable = false
    }

    // Check data integrity
    stats.integrity = await verifyChecksum(filePath)

    // Count backup files
    try {
      const dir = path.dirname(filePath)
      const baseName = path.basename(filePath)
      const files = await fs.readdir(dir)
      stats.backupCount = files.filter(file =>
        file.startsWith(`${baseName}${FILE_CONFIG.BACKUP_SUFFIX}`)
      ).length
    } catch (error) {
      // Directory might not exist
    }

    return stats
  } catch (error) {
    console.error('Error checking file health:', error.message)
    return {
      exists: false,
      readable: false,
      integrity: { valid: false, reason: error.message },
      backupCount: 0,
      lastModified: null,
      size: 0
    }
  }
}

module.exports = {
  atomicWrite,
  safeRead,
  initializeFile,
  recoverFromBackup,
  getFileHealth,
  createBackup,
  cleanupBackups,
  verifyChecksum,
  FILE_CONFIG
}