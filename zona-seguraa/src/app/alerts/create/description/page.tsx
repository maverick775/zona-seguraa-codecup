'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AlertCreateDescriptionPage() {
  const [description, setDescription] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/alerts/create/location" className="text-gray-600">
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
          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
          <div className="w-12 h-1 bg-green-600"></div>
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">Paso 3: Descripción</p>
      </div>

      {/* Description Form */}
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Describe qué está sucediendo</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción de la emergencia *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe detalladamente lo que está ocurriendo..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
          />
          <p className="text-sm text-gray-500 mt-1">
            {description.length}/500 caracteres
          </p>
        </div>

        {/* Quick Options */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Información adicional (opcional)</p>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700">Hay personas heridas</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700">Se necesitan servicios médicos</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700">Hay niños o adultos mayores involucrados</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700">La situación está empeorando</span>
            </label>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tu información de contacto (opcional)
          </label>
          <input
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Teléfono o forma de contactarte"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Esta información solo será visible para los coordinadores de emergencia
          </p>
        </div>

        {/* Continue Button */}
        <div className="pb-8">
          <Link 
            href="/alerts/create/confirm"
            className={`block w-full py-4 px-6 rounded-xl font-medium text-center transition-colors ${
              description.trim().length > 0
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={(e) => description.trim().length === 0 && e.preventDefault()}
          >
            Continuar
          </Link>
        </div>
      </div>
    </div>
  );
}
