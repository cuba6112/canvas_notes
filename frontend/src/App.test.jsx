import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock the Canvas component since it uses Konva which requires canvas context
vi.mock('./components/Canvas.jsx', () => ({
  default: () => <div data-testid="canvas-mock">Canvas Component</div>
}))

// Mock the Sidebar component
vi.mock('./components/Sidebar.jsx', () => ({
  default: () => <div data-testid="sidebar-mock">Sidebar Component</div>
}))

describe('App', () => {
  it('renders app title', () => {
    render(<App />)
    const title = screen.getByText(/Canvas Notes App/i)
    expect(title).toBeInTheDocument()
  })

  it('renders mocked canvas component', () => {
    render(<App />)
    const canvas = screen.getByTestId('canvas-mock')
    expect(canvas).toBeInTheDocument()
  })

  it('renders mocked sidebar component', () => {
    render(<App />)
    const sidebar = screen.getByTestId('sidebar-mock')
    expect(sidebar).toBeInTheDocument()
  })
})