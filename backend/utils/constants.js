/**
 * Constants for backend configuration
 */

const path = require('path')

const NOTES_FILE = process.env.NOTES_FILE || path.join(__dirname, '..', 'notes.json')

module.exports = {
  NOTES_FILE
}