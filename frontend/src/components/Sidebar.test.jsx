import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Sidebar from './Sidebar'

describe('Sidebar', () => {
  const mockNotes = [
    { id: '1', title: 'Test Note 1', content: 'Test content 1' },
    { id: '2', title: 'Test Note 2', content: 'Test content 2' },
  ]

  it('renders sidebar title with note count', () => {
    const mockOnSearchChange = vi.fn()
    render(<Sidebar notes={mockNotes} searchTerm="" onSearchChange={mockOnSearchChange} />)

    // The title now includes the count, so we need to look for the full text
    const title = screen.getByText(/Notes \(2\)/)
    expect(title).toBeInTheDocument()
  })

  it('renders search input', () => {
    const mockOnSearchChange = vi.fn()
    render(<Sidebar notes={mockNotes} searchTerm="" onSearchChange={mockOnSearchChange} />)

    const searchInput = screen.getByPlaceholderText('Search notes...')
    expect(searchInput).toBeInTheDocument()
  })

  it('displays notes', () => {
    const mockOnSearchChange = vi.fn()
    render(<Sidebar notes={mockNotes} searchTerm="" onSearchChange={mockOnSearchChange} />)

    expect(screen.getByText('Test Note 1')).toBeInTheDocument()
    expect(screen.getByText('Test Note 2')).toBeInTheDocument()
  })

  it('calls onSearchChange when search input changes', () => {
    const mockOnSearchChange = vi.fn()
    render(<Sidebar notes={mockNotes} searchTerm="" onSearchChange={mockOnSearchChange} />)

    const searchInput = screen.getByPlaceholderText('Search notes...')
    fireEvent.change(searchInput, { target: { value: 'test' } })

    expect(mockOnSearchChange).toHaveBeenCalledWith('test')
  })
})