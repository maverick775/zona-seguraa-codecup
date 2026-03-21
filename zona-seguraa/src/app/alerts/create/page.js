'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ZONE_ID = 'a1000000-0000-0000-0000-000000000001';

const alertTypes = [
  { id: 'medical', name: 'Médica', icon: '🏥', color: 'bg-red-500' },
  { id: 'security', name: 'Seguridad', icon: '🚨', color: 'bg-blue-500' },
  { id: 'fire', name: 'Incendio', icon: '🔥', color: 'bg-orange-500' },
  { id: 'evacuation', name: 'Evacuación', icon: '🚪', color: 'bg-yellow-500' },
];

export default function AlertCreatePage() {
  const router = useRouter();
  const [nodes, setNodes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedNode, setSelectedNode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/nodes?zone_id=${ZONE_ID}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNodes(data); })
      .catch((err) => console.error('Error loading nodes:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType || !selectedNode) {
      setError('Selecciona tipo de emergencia y nodo');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: ZONE_ID,
          node_id: selectedNode,
          type: selectedType,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al crear alerta');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setTimeout(() => router.push('/zone'), 2000);
    } catch (err) {
      setError('Error de conexión');
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Alerta Enviada</h1>
          <p className="text-gray-600 mb-4">Tu alerta ha sido creada exitosamente</p>
          <p className="text-sm text-gray-500">Redirigiendo al mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Crear Alerta</h1>
            <div className="w-6" />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">¿Qué tipo de emergencia?</h2>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {alertTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSelectedType(type.id)}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedType === type.id
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 ${type.color} rounded-full flex items-center justify-center text-2xl mb-3 mx-auto`}>
                {type.icon}
              </div>
              <p className="font-medium text-gray-900">{type.name}</p>
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación (nodo)</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
          >
            <option value="" className="text-gray-500">Selecciona un nodo...</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id} className="text-gray-900">
                {node.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe lo que está ocurriendo..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedType || !selectedNode || submitting}
          className="w-full py-4 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enviando...' : 'Enviar Alerta'}
        </button>
      </form>
    </div>
  );
}
