'use client';

import { useState } from 'react';
import Link from 'next/link';

const locations = [
  { id: 'main-entrance', name: 'Entrada Principal', description: 'Acceso principal al edificio' },
  { id: 'medical-point', name: 'Punto Médico', description: 'Área de atención médica' },
  { id: 'emergency-exit-north', name: 'Salida Emergencia Norte', description: 'Salida de emergencia norte' },
  { id: 'meeting-point-east', name: 'Punto Reunión Este', description: 'Punto de reunión principal' },
  { id: 'parking-area', name: 'Área de Estacionamiento', description: 'Zona de estacionamiento' },
  { id: 'cafeteria', name: 'Cafetería', description: 'Área de comida y descanso' }
];

export default function AlertCreateLocationPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [customLocation, setCustomLocation] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/alerts/create" className="text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Crear Alerta</h1>
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
          <div className="w-12 h-1 bg-green-600"></div>
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">Paso 2: Ubicación</p>
      </div>

      {/* Location Selection */}
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">¿Dónde ocurre la emergencia?</h2>
        
        <div className="space-y-3 mb-6">
          {locations.map((location) => (
            <label key={location.id} className="block">
              <input
                type="radio"
                name="location"
                value={location.id}
                checked={selectedLocation === location.id}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="sr-only"
              />
              <div className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLocation === location.id
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
                <div className="flex items-start">
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                    selectedLocation === location.id
                      ? 'border-teal-600 bg-teal-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedLocation === location.id && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{location.name}</p>
                    <p className="text-sm text-gray-600">{location.description}</p>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Custom Location */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            O especifica otra ubicación:
          </label>
          <input
            type="text"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
            placeholder="Describe la ubicación..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        {/* Continue Button */}
        <div className="pb-8">
          <Link 
            href="/alerts/create/description"
            className={`block w-full py-4 px-6 rounded-xl font-medium text-center transition-colors ${
              selectedLocation || customLocation
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={(e) => !(selectedLocation || customLocation) && e.preventDefault()}
          >
            Continuar
          </Link>
        </div>
      </div>
    </div>
  );
}
