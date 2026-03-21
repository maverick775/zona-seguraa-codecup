'use client';

import { useState } from 'react';
import Link from 'next/link';

const alertTypes = [
  { id: 'medical', name: 'Médica', icon: '🏥', color: 'bg-red-500' },
  { id: 'security', name: 'Seguridad', icon: '🚨', color: 'bg-blue-500' },
  { id: 'fire', name: 'Incendio', icon: '🔥', color: 'bg-orange-500' },
  { id: 'evacuation', name: 'Evacuación', icon: '🚪', color: 'bg-yellow-500' },
  { id: 'other', name: 'Otra', icon: '⚠️', color: 'bg-gray-500' }
];

export default function AlertCreatePage() {
  const [selectedType, setSelectedType] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-gray-600">
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
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">Paso 1: Tipo de emergencia</p>
      </div>

      {/* Alert Type Selection */}
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">¿Qué tipo de emergencia?</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          {alertTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedType === type.id
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 ${type.color} rounded-full flex items-center justify-center text-white text-2xl mb-3 mx-auto`}>
                {type.icon}
              </div>
              <p className="font-medium text-gray-900">{type.name}</p>
            </button>
          ))}
        </div>

        {/* Emergency Level Selection */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Nivel de emergencia</h3>
        <div className="space-y-3 mb-8">
          {[1, 2, 3, 4].map((level) => (
            <label key={level} className="flex items-center p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300">
              <input
                type="radio"
                name="level"
                value={level}
                className="mr-3 text-teal-600 focus:ring-teal-500"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    level === 1 ? 'bg-yellow-400' :
                    level === 2 ? 'bg-orange-400' :
                    level === 3 ? 'bg-red-400' : 'bg-red-600'
                  }`}></div>
                  <span className="font-medium text-gray-900">
                    {level === 1 ? 'Bajo' :
                     level === 2 ? 'Medio' :
                     level === 3 ? 'Alto' : 'Crítico'}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Continue Button */}
        <div className="pb-8">
          <Link 
            href="/alerts/create/location"
            className={`block w-full py-4 px-6 rounded-xl font-medium text-center transition-colors ${
              selectedType
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={(e) => !selectedType && e.preventDefault()}
          >
            Continuar
          </Link>
        </div>
      </div>
    </div>
  );
}
