'use client'

import { useState } from 'react'
import FilterChips from '@/components/signalarm/FilterChips'
import CategoryChips from '@/components/signalarm/CategoryChips'

// Componentes con estado local para probarlos con teclado y lector de pantalla.
export default function GalleryInteractive() {
  const [filter, setFilter] = useState('open')
  const [type, setType] = useState('')
  return (
    <section aria-labelledby="g-interactivos" className="space-y-4">
      <h2 id="g-interactivos" className="text-lg font-bold text-gray-900">Filtros y categorías</h2>
      <FilterChips
        legend="Estado"
        value={filter}
        onChange={setFilter}
        options={[{ key: 'open', label: 'Pendientes', count: 2 }, { key: 'resolved', label: 'Cerrado', count: 1 }, { key: 'all', label: 'Todos', count: 5 }]}
      />
      <CategoryChips value={type} onChange={setType} />
      <p className="text-sm text-gray-700" aria-live="polite">Seleccionado: {type || 'ninguno'} · filtro: {filter}</p>
    </section>
  )
}
