// Note type definition using JSDoc for type hints
/**
 * @typedef {Object} Note
 * @property {string} id - Unique identifier for the note
 * @property {string} title - Note title
 * @property {string} content - Note content
 * @property {{x: number, y: number}} position - Position on canvas
 * @property {{width: number, height: number}} dimensions - Note dimensions
 * @property {string} color - Note background color
 * @property {string[]} tags - Array of tags
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {boolean} aiGenerated - Whether note was AI generated
 * @property {string[]} connections - Array of connected note IDs
 */

// Export empty object to make this a module
export {}