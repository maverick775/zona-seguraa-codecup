'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { mockApi } from '@/lib/mockData';

export default function AlertCreateConfirmPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    try {
      await mockApi.createAlert({
        type: 'medical', // This would come from previous steps
        level: 3,
        status: 'active',
        description: 'Persona requiere atención médica urgente en el área principal',
        zone_id: 'zone-1',
        created_by_nick: 'usuario_actual'
      });
      
      setIsSubmitted(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/alerts/validation');
      }, 2000);
    } catch (error) {
      console.error('Error creating alert:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Alerta Enviada</h1>
          <p className="text-gray-600 mb-4">Tu alerta ha sido creada exitosamente</p>
          <p className="text-sm text-gray-500">Redirigiendo a validación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/alerts/create/description" className="text-gray-600">
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
          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">✓</div>
          <div className="w-12 h-1 bg-green-600"></div>
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">Paso 4: Confirmación</p>
      </div>

      {/* Confirmation Content */}
      <div className="max-w-md mx-auto px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Revisa tu alerta antes de enviar</h2>
        
        {/* Alert Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3 mt-1">
                <span className="text-xl">🏥</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Emergencia Médica</p>
                <p className="text-sm text-gray-600">Nivel: Alto</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Ubicación:</p>
              <p className="text-gray-900">Punto Médico Principal</p>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Descripción:</p>
              <p className="text-gray-900">Persona requiere atención médica urgente en el área principal</p>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Información adicional:</p>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Hay personas heridas
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Se necesitan servicios médicos
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Importante</p>
              <p className="text-sm text-yellow-700">Una vez enviada, esta alerta será visible para todos los usuarios y coordinadores en tu zona.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 px-6 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enviando alerta...' : 'Enviar Alerta'}
          </button>
          
          <Link
            href="/alerts/create/description"
            className="block w-full py-4 px-6 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-50 transition-colors"
          >
            Modificar información
          </Link>
        </div>
      </div>
    </div>
  );
}
