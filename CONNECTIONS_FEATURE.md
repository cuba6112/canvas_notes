# Note Connections Feature Guide

## Overview

The Canvas Notes app now includes a powerful **visual connection system** that allows you to link related notes together, similar to connecting ideas on a physical blackboard with strings or cords. Connected notes automatically serve as context for AI queries, creating a knowledge graph that enhances AI understanding.

---

## Features

### 1. Visual Connections (Cords/Lines)

**Visual Design:**
- Smooth, curved bezier lines connecting note centers
- Beautiful indigo/purple color (#6366f1) with shadow effects
- Interactive hover states (thickens and brightens on hover)
- Click to delete connections

**Properties:**
- Stroke width: 2px (3px on hover)
- Opacity: 0.6 (0.9 on hover)
- Shadow blur with purple tint for depth
- Smooth cubic bezier curves with automatic curvature

---

### 2. Creating Connections

#### Method 1: Context Menu (Recommended)
1. Hover over a note or select it
2. Click the three dots (⋯) button in the header
3. Select **"🔗 Connect to..."**
4. Connection mode activates (cursor changes to crosshair)
5. Click another note to complete the connection
6. Press ESC to cancel connection mode

#### Method 2: Programmatic
- The system already supports `addConnection(fromId, toId)` API
- Connections are bidirectional (A→B is same as B→A)
- Duplicate connections are automatically prevented

---

### 3. Managing Connections

**Delete Connection:**
- Click directly on the connection line
- Confirm deletion in the dialog

**Auto-Cleanup:**
- Connections are automatically removed when a note is deleted
- No orphaned connections remain

**View Connections:**
- All connections are always visible on the canvas
- Connected notes are visually linked with smooth curves

---

### 4. AI Context Integration

### How It Works

When you have notes selected and use the AI Assistant:

1. **Selected Notes** - The notes you've explicitly selected
2. **Connected Notes** - All notes connected to your selected notes
3. **Combined Context** - AI uses content from ALL these notes

### Visual Indicator

The AI Assistant panel shows:
```
🔗 Connected Knowledge Context
Using 2 selected notes + 3 connected notes
AI will use content from all connected notes as context
```

This means:
- 2 notes you selected
- 3 additional notes connected to those selected notes
- Total of 5 notes worth of context for the AI

### Benefits

**Enhanced Understanding:**
- AI has more context about related topics
- Better answers with multi-note knowledge
- Automatically includes relevant background information

**Knowledge Graphs:**
- Build interconnected knowledge bases
- Connect prerequisites, related topics, examples
- Create concept maps with AI-accessible relationships

---

## Use Cases

### 1. Study Materials
```
[Main Concept] → [Examples]
              → [Prerequisites]
              → [Practice Problems]
```
AI queries on the main concept automatically include examples and prerequisites as context.

### 2. Project Planning
```
[Project Overview] → [Requirements]
                   → [Timeline]
                   → [Resources]
```
Ask AI about the project and it considers all connected aspects.

### 3. Research Notes
```
[Research Question] → [Source 1]
                    → [Source 2]
                    → [Synthesis]
```
AI can synthesize information from all connected sources.

### 4. Meeting Notes
```
[Meeting Agenda] → [Action Items]
                 → [Decisions]
                 → [Follow-ups]
```
AI understands the full meeting context when queried.

---

## Technical Implementation

### Connection Data Structure
```javascript
{
  id: "uuid",
  from: "noteId1",
  to: "noteId2",
  createdAt: "ISO timestamp"
}
```

### Available Functions

#### From `useConnections` Hook:
```javascript
addConnection(fromId, toId)              // Create connection
removeConnection(connectionId)           // Delete specific connection
removeConnectionsBetween(id1, id2)       // Delete by note IDs
removeConnectionsForNote(noteId)         // Delete all for a note
getConnectedNotes(noteId)                // Get directly connected notes
getConnectionsForNote(noteId)            // Get connection objects
isConnected(id1, id2)                    // Check if connected
getConnectedSubgraph(noteId, maxDepth)   // Get transitively connected notes
getShortestPath(startId, endId)          // Find path between notes
```

#### Graph Algorithms:
- **Breadth-First Search (BFS)** for finding shortest paths
- **Subgraph traversal** with depth limiting to prevent infinite loops
- **Visited set tracking** to handle circular connections

---

## Connection Visualization Details

### Curve Calculation
```javascript
// Calculate smooth bezier curve
const dx = toX - fromX
const dy = toY - fromY
const distance = Math.sqrt(dx * dx + dy * dy)
const curvature = Math.min(distance * 0.3, 100)

// Control points for smooth arc
points = [
  fromX, fromY,
  fromX + dx * 0.3, fromY - curvature,
  toX - dx * 0.3, toY - curvature,
  toX, toY
]
```

### Interactive States
```javascript
Normal:  strokeWidth: 2, opacity: 0.6
Hover:   strokeWidth: 3, opacity: 0.9, cursor: pointer
```

---

## AI Context Algorithm

### Context Collection Process

1. **Get Selected Notes**
   ```javascript
   selectedNotes.forEach(noteId => {
     contextNotes.add(notes.find(n => n.id === noteId))
   })
   ```

2. **Get Connected Notes**
   ```javascript
   selectedNotes.forEach(noteId => {
     const connected = getConnectedNotes(noteId)
     connected.forEach(connectedId => {
       contextNotes.add(notes.find(n => n.id === connectedId))
     })
   })
   ```

3. **Build Context String**
   ```javascript
   const context = Array.from(contextNotes)
     .map(note => `Title: ${note.title}\nContent: ${note.content}`)
     .join('\n\n---\n\n')
   ```

4. **Send to AI**
   - Context prepended to user's query
   - AI receives full context of connected knowledge
   - Generates response with comprehensive understanding

---

## Best Practices

### 1. Connection Strategy
✅ **Do:**
- Connect related concepts
- Link examples to main topics
- Connect prerequisites to advanced topics
- Create hierarchical relationships

❌ **Don't:**
- Over-connect unrelated notes
- Create circular dependencies unnecessarily
- Connect every note to every other note

### 2. AI Usage
✅ **Do:**
- Select the main note you're querying about
- Let connections provide automatic context
- Build knowledge graphs for complex topics

❌ **Don't:**
- Rely solely on connections (select key notes too)
- Forget that context has limits (3 levels deep by default)

### 3. Organization
✅ **Do:**
- Use colors to differentiate note types
- Name notes clearly for context clarity
- Review and prune unnecessary connections

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click connection line | Delete connection |
| ESC | Cancel connection mode |
| Hover note | Show three dots menu |
| Three dots → Connect | Start connection mode |

---

## Future Enhancements

### Potential Features:
- [ ] Connection labels/types (e.g., "prerequisite", "example", "related")
- [ ] Connection strength/weight visualization
- [ ] Multiple connection styles (dotted, solid, colored)
- [ ] Connection filtering/toggling
- [ ] Export/import connection graph
- [ ] Connection analytics (most connected notes)
- [ ] Smart suggestions for connections
- [ ] Connection templates for common patterns

---

## Troubleshooting

### Connection not appearing?
- Check both notes exist and are visible
- Refresh the canvas
- Try creating connection again

### AI not using connection context?
- Verify notes are actually connected (visible line)
- Ensure you've selected at least one note
- Check the context indicator shows connected notes count

### Connection mode stuck?
- Press ESC to exit connection mode
- Refresh the page if needed
- Check for JavaScript errors in console

---

## API Reference

### Canvas Component
```javascript
<Canvas
  connections={connections}
  addConnection={addConnection}
  removeConnection={removeConnection}
  getConnectedNotes={getConnectedNotes}
  getConnectedSubgraph={getConnectedSubgraph}
/>
```

### Note Component
```javascript
<Note
  onConnect={addConnection}  // Called when connection created
/>
```

### AIAssistant Component
```javascript
<AIAssistant
  getConnectedNotes={getConnectedNotes}  // For context building
  selectedNotes={selectedNotes}          // Base context
/>
```

---

## Examples

### Example 1: Study Guide
```javascript
// Create main topic note
const mainTopic = createNote({
  title: "React Hooks",
  content: "React Hooks are functions..."
})

// Create connected notes
const useState Hook = createNote({
  title: "useState",
  content: "useState is a Hook that..."
})

const useEffectHook = createNote({
  title: "useEffect",
  content: "useEffect is a Hook for..."
})

// Connect them
addConnection(mainTopic.id, useStateHook.id)
addConnection(mainTopic.id, useEffectHook.id)

// Now when you select mainTopic and ask AI:
// "Explain how to use these hooks together"
// AI has context from all three notes!
```

### Example 2: Project Documentation
```javascript
// Project structure
const project = createNote({ title: "Website Redesign" })
const requirements = createNote({ title: "Requirements" })
const design = createNote({ title: "Design Mockups" })
const timeline = createNote({ title: "Timeline" })

// Create knowledge graph
addConnection(project.id, requirements.id)
addConnection(project.id, design.id)
addConnection(project.id, timeline.id)
addConnection(requirements.id, design.id)  // Link requirements to design

// Query: "What are the key requirements for the design phase?"
// AI uses: project + requirements + design context
```

---

## Summary

The connection system transforms Canvas Notes from a simple note-taking app into a **knowledge graph tool** where:

1. **Visual cords** connect related ideas like a physical blackboard
2. **AI automatically uses** connected notes as context
3. **Knowledge compounds** through interconnected relationships
4. **Complex topics** are broken down into connected components

This creates a more natural, intuitive way to build and query interconnected knowledge!

---

**Version**: 1.0.0
**Last Updated**: 2025-09-29
**Status**: ✅ Fully Implemented and Tested