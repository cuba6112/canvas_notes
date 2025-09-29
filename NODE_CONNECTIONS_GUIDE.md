# Node-to-Node Connection System

## Overview

The Canvas Notes app now features a **professional node-based connection system** with connection ports on each side of every note. This allows you to draw precise connections between specific points on notes, similar to flowchart tools like Lucidchart, Miro, or Figma.

---

## Features

### 1. Connection Nodes/Ports

Each note has **4 connection nodes** positioned at:
- **Top** - Center of the top edge
- **Right** - Center of the right edge
- **Bottom** - Center of the bottom edge
- **Left** - Center of the left edge

### 2. Visual Design

**Normal State:**
- Small dot (3px radius)
- Subtle opacity (0.3)
- Barely visible until interaction

**Active State (Hover/Selected):**
- Larger dot (5px radius)
- Outer ring (10px radius)
- Full opacity
- Indigo color (#6366f1)
- Glow shadow effect

**Connection Mode:**
- Green color (#10b981) for active node
- Pulsing dashed ring animation
- All other notes show highlighted ports
- Crosshair cursor

---

## How to Create Connections

### Method 1: Drag-to-Connect (Primary)

1. **Hover or select a note** - Connection nodes appear on all 4 sides
2. **Click and drag from a connection node** - A preview line follows your cursor
3. **Release over a node on another note** - Completes the connection
4. **Press ESC** - Cancel connection mode

**Visual Feedback:**
- Green dashed line follows cursor while dragging
- Source node turns green during drag
- Target nodes highlight when available
- Cursor changes to crosshair during connection mode

### Method 2: Context Menu (Legacy)

The old menu-based connection system still works for center-to-center connections.

---

## Connection Types

### Port-to-Port Connections
```
Note A [right port] → Note B [left port]
```
- Precise positioning
- Professional flowchart appearance
- Clear directional flow

### Center-to-Center Connections (Legacy)
```
Note A [center] → Note B [center]
```
- Still supported for backward compatibility
- Created via context menu "Connect to..." option

---

## Visual Appearance

### Connection Lines

**Style:**
- Smooth bezier curves
- Indigo/purple color (#6366f1)
- 2px stroke width (3px on hover)
- Soft shadow with purple tint
- Semi-transparent (0.6 opacity, 0.9 on hover)

**Curvature:**
- Automatically calculated based on distance
- Maximum curvature: 100px
- Creates natural, flowing connections

### Connection from Top to Bottom
```
    [Note A]
       •
       |
      / \
     /   \
    |     |
     \   /
      \ /
       •
    [Note B]
```

### Connection from Right to Left
```
[Note A] •———————————• [Note B]
         \         /
          \       /
           \_____/
```

---

## Connection Data Structure

```javascript
{
  id: "uuid",
  from: "noteId1",         // Source note ID
  to: "noteId2",           // Target note ID
  fromPort: "right",       // Source port: top/right/bottom/left/center
  toPort: "left",          // Target port: top/right/bottom/left/center
  createdAt: "ISO timestamp"
}
```

### Legacy Connections
Older connections without `fromPort`/`toPort` default to `"center"` for compatibility.

---

## Use Cases

### 1. Flowcharts
```
[Start] right → left [Process 1]
[Process 1] bottom → top [Decision]
[Decision] right → left [Process 2]
[Decision] bottom → top [End]
```

### 2. Mind Maps
```
        [Central Idea]
           /  |  \
          /   |   \
      [A]   [B]   [C]
       |     |     |
      [A1]  [B1]  [C1]
```

### 3. Process Diagrams
```
[Input] → [Validate] → [Process] → [Output]
           ↓
       [Error Log]
```

### 4. Knowledge Graphs
```
[Main Topic]
  ├→ [Subtopic 1] → [Example 1]
  ├→ [Subtopic 2] → [Example 2]
  └→ [Related] → [Reference]
```

---

## AI Context Integration

### How It Works

Connections work **regardless of which ports are used**. The AI Assistant:

1. Detects all notes connected to selected notes
2. Includes their content as context
3. Works with any port combination (top-to-bottom, right-to-left, etc.)

### Example

```javascript
// Create flowchart
[Requirements] (right) → (left) [Design]
[Design] (bottom) → (top) [Implementation]
[Implementation] (right) → (left) [Testing]

// Select "Design" and ask AI:
// "What are the next steps?"

// AI uses context from:
// - Design (selected)
// - Requirements (connected via right→left)
// - Implementation (connected via bottom→top)
```

---

## Technical Implementation

### Connection Node Component

**Location:** `/src/components/ConnectionNode.jsx`

```javascript
<ConnectionNode
  noteId="note-id"
  position="top|right|bottom|left"
  noteWidth={300}
  noteHeight={200}
  onStartConnection={(noteId, port) => {...}}
  onCompleteConnection={(noteId, port) => {...}}
  isConnectionMode={boolean}
  isHighlighted={boolean}
/>
```

### Position Calculation

```javascript
const getPortPosition = (note, port) => {
  const baseX = note.position.x
  const baseY = note.position.y
  const width = note.dimensions.width
  const height = note.dimensions.height

  switch (port) {
    case 'top':
      return { x: baseX + width / 2, y: baseY }
    case 'right':
      return { x: baseX + width, y: baseY + height / 2 }
    case 'bottom':
      return { x: baseX + width / 2, y: baseY + height }
    case 'left':
      return { x: baseX, y: baseY + height / 2 }
    default: // 'center'
      return { x: baseX + width / 2, y: baseY + height / 2 }
  }
}
```

### Curve Calculation

```javascript
const dx = toPos.x - fromPos.x
const dy = toPos.y - fromPos.y
const distance = Math.sqrt(dx * dx + dy * dy)
const curvature = Math.min(distance * 0.3, 100)

// Bezier control points
const points = [
  fromPos.x, fromPos.y,                    // Start
  fromPos.x + dx * 0.3, fromPos.y - curvature,  // Control 1
  toPos.x - dx * 0.3, toPos.y - curvature,      // Control 2
  toPos.x, toPos.y                          // End
]
```

---

## State Management

### Canvas Component State

```javascript
const [connectionMode, setConnectionMode] = useState(null)
// Structure: { fromNoteId: "id", fromPort: "right" }

const [tempConnectionLine, setTempConnectionLine] = useState(null)
// For future feature: preview line while connecting
```

### Connection Mode Flow

1. **Idle** - connectionMode = null
2. **User clicks node** - connectionMode = { fromNoteId, fromPort }
3. **Cursor changes** - document.body.style.cursor = 'crosshair'
4. **User clicks target** - addConnection() called
5. **Reset** - connectionMode = null, cursor = 'default'

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ESC | Cancel connection mode |
| Click node | Start connection (first click) or complete connection (second click) |

---

## Styling States

### Node States

```javascript
// Normal (not hovered, not selected)
radius: 3px
opacity: 0.3
visible: when note is hovered/selected

// Active (hovered or selected note)
radius: 5px
opacity: 1.0
outer ring: 10px radius
glow shadow: 8px blur

// Connection mode - source note
color: #10b981 (green)
pulsing animation
dashed ring: 8px radius

// Connection mode - target notes
color: #6366f1 (indigo)
highlighted state
pulse on hover
```

### Connection Line States

```javascript
// Normal
strokeWidth: 2
opacity: 0.6
color: #6366f1

// Hover
strokeWidth: 3
opacity: 0.9
cursor: pointer

// During connection mode
// (future: preview line from source to cursor)
```

---

## Best Practices

### ✅ Do:

- **Use appropriate ports** - Connect right→left for left-to-right flow
- **Maintain flow direction** - Top→bottom for hierarchies
- **Use consistent patterns** - Same port combinations for similar relationships
- **Group related notes** - Position notes logically before connecting

### ❌ Don't:

- **Cross too many connections** - Can become visually messy
- **Connect distant notes** - Consider repositioning for clarity
- **Use random ports** - Be intentional with port selection
- **Over-connect** - Each connection should add meaningful information

---

## Comparison to Other Tools

### vs. Lucidchart
✅ Similar node-based connection system
✅ Automatic curve generation
✅ Clean, professional appearance
➕ Added AI context integration

### vs. Miro
✅ Flexible positioning
✅ Port-based connections
➕ Integrated with note content for AI
➕ Simpler, focused interface

### vs. Figma
✅ Precise port positioning
✅ Bezier curve connections
➕ Automatic context for AI queries
➕ No need for separate connector tool

---

## Migration from Legacy System

### Automatic Compatibility

Old connections (created via context menu) still work perfectly:
- Automatically use `fromPort: "center"` and `toPort: "center"`
- Render correctly with the new system
- No data migration needed

### New Features

1. **Precise positioning** - Choose exact connection points
2. **Better visual flow** - Connections look more professional
3. **Clearer diagrams** - Port-specific connections reduce ambiguity
4. **Maintained AI context** - All connection types work with AI

---

## Troubleshooting

### Connection nodes not visible?
- **Hover over the note** - Nodes appear on hover/select
- **Check selection state** - Nodes visible when note is selected
- **Connection mode** - Nodes always visible during connection mode

### Can't complete connection?
- **Check cursor** - Should show crosshair in connection mode
- **Try different note** - Can't connect note to itself
- **Press ESC and retry** - Reset connection mode
- **Check console** - Look for JavaScript errors

### Connection not appearing?
- **Verify both notes exist** - Check note IDs are valid
- **Check connection data** - Inspect connections array
- **Refresh canvas** - Try panning or zooming
- **Check line color** - Might be hidden behind notes

### Nodes not clickable?
- **Z-index issue** - Nodes should be above note content
- **Event propagation** - Check cancelBubble in onClick
- **Drag interference** - Don't try to connect while dragging

---

## Future Enhancements

### Planned Features:
- [ ] **Preview line** - Show connection line while dragging from node
- [ ] **Connection labels** - Add text labels to connections
- [ ] **Connection types** - Different colors/styles for different relationships
- [ ] **Smart routing** - Automatic path finding to avoid note overlaps
- [ ] **Connection editing** - Drag to change port positions
- [ ] **Snap to grid** - Align connections to grid positions
- [ ] **Curved vs. straight** - Toggle between curved and straight lines
- [ ] **Multiple connections per port** - Allow multiple connections from same port

---

## API Reference

### useConnections Hook

```javascript
const {
  addConnection,        // (fromId, toId, fromPort?, toPort?) => Connection
  removeConnection,     // (connectionId) => void
  connections          // Array<Connection>
} = useConnections()
```

### Connection Type

```typescript
interface Connection {
  id: string
  from: string           // Note ID
  to: string            // Note ID
  fromPort: 'top' | 'right' | 'bottom' | 'left' | 'center'
  toPort: 'top' | 'right' | 'bottom' | 'left' | 'center'
  createdAt: string     // ISO timestamp
}
```

### Props

#### Note Component
```javascript
<Note
  connectionMode={connectionMode}
  onStartConnection={(noteId, port) => void}
  onCompleteConnection={(noteId, port) => void}
/>
```

#### ConnectionNode Component
```javascript
<ConnectionNode
  noteId={string}
  position={'top' | 'right' | 'bottom' | 'left'}
  noteWidth={number}
  noteHeight={number}
  onStartConnection={(noteId, port) => void}
  onCompleteConnection={(noteId, port) => void}
  isConnectionMode={boolean}
  isHighlighted={boolean}
/>
```

---

## Summary

The node-based connection system provides:

✅ **Professional appearance** - Flowchart-quality connections
✅ **Precise control** - Choose exact connection points
✅ **Visual clarity** - Clear directional flow
✅ **AI integration** - Automatic context for queries
✅ **Backward compatible** - Old connections still work
✅ **Intuitive UX** - Click node → click node → done

Transform your notes from simple sticky notes into a **professional diagram tool** with semantic connections that enhance both visual organization and AI understanding!

---

**Version**: 2.0.0
**Last Updated**: 2025-09-29
**Status**: ✅ Fully Implemented