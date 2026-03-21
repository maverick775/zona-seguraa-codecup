'use client';

import { useState } from 'react';
import Link from 'next/link';
import { mockAlerts, mockApi } from '@/lib/mockData';

export default function AlertValidationPage() {
  const [selectedAlert, setSelectedAlert] = useState(mockAlerts[0]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteComment, setVoteComment] = useState('');

  const handleVote = async (confirm: boolean) => {
    try {
      await mockApi.voteAlert(selectedAlert.id, {
        alert_id: selectedAlert.id,
        nickname: 'usuario_actual',
        role: 'visitor',
        weight: 1,
        comment: voteComment
      });
      setHasVoted(true);
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-yellow-400';
      case 2: return 'bg-orange-400';
      case 3: return 'bg-red-400';
      case 4: return 'bg-red-600';
      default: return 'bg-gray-400';
    }
  };

  const getLevelText = (level: number) => {
    switch (level) {
      case 1: return 'Bajo';
      case 2: return 'Medio';
      case 3: return 'Alto';
      case 4: return 'Crítico';
      default: return 'Desconocido';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'medical': return '🏥';
      case 'security': return '🚨';
      case 'fire': return '🔥';
      case 'evacuation': return '🚪';
      default: return '⚠️';
    }
  };

  const getAlertTypeText = (type: string) => {
    switch (type) {
      case 'medical': return 'Emergencia Médica';
      case 'security': return 'Seguridad';
      case 'fire': return 'Incendio';
      case 'evacuation': return 'Evacuación';
      default: return 'Otra';
    }
  };

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
            <h1 className="text-lg font-semibold text-gray-900">Validar Alerta</h1>
            <div className="w-6"></div>
          </div>
        </div>
      </div>

      {/* Alert Card */}
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          {/* Alert Header */}
          <div className={`p-4 ${selectedAlert.level >= 3 ? 'bg-red-50 border-b border-red-200' : 'bg-yellow-50 border-b border-yellow-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className={`w-12 h-12 ${selectedAlert.level >= 3 ? 'bg-red-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center mr-3`}>
                  <span className="text-2xl">{getAlertIcon(selectedAlert.type)}</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{getAlertTypeText(selectedAlert.type)}</h2>
                  <div className="flex items-center mt-1">
                    <div className={`w-3 h-3 rounded-full ${getLevelColor(selectedAlert.level)} mr-2`}></div>
                    <span className="text-sm font-medium text-gray-700">Nivel {getLevelText(selectedAlert.level)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Hace 5 min</p>
                <p className="text-xs text-gray-500">por {selectedAlert.created_by_nick}</p>
              </div>
            </div>
          </div>

          {/* Alert Content */}
          <div className="p-4">
            <p className="text-gray-900 mb-4">{selectedAlert.description}</p>
            
            {/* Location */}
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Punto Médico Principal
            </div>

            {/* Validation Progress */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Validación comunitaria</span>
                <span className="text-sm font-bold text-teal-600">{Math.round((selectedAlert.validation_ratio || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(selectedAlert.validation_ratio || 0) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedAlert.votes?.length || 0} validaciones • 60% necesario para confirmar
              </p>
            </div>

            {/* Recent Votes */}
            {selectedAlert.votes && selectedAlert.votes.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Validaciones recientes:</p>
                <div className="space-y-2">
                  {selectedAlert.votes.slice(0, 3).map((vote) => (
                    <div key={vote.id} className="flex items-center text-sm">
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{vote.nickname}</span>
                        <span className="text-gray-500 ml-1">confirmó</span>
                        {vote.comment && (
                          <p className="text-xs text-gray-600 mt-1">"{vote.comment}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Validation Actions */}
        {!hasVoted ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">¿Puedes confirmar esta alerta?</h3>
            
            <div className="space-y-3 mb-4">
              <button
                onClick={() => handleVote(true)}
                className="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Sí, puedo confirmar
              </button>
              
              <button
                onClick={() => handleVote(false)}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                No tengo información
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comentario (opcional)
              </label>
              <textarea
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder="Añade información adicional..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Tu validación ha sido registrada</span>
            </div>
          </div>
        )}

        {/* Other Alerts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Otras alertas activas</h3>
          <div className="space-y-3">
            {mockAlerts.slice(1).map((alert) => (
              <Link
                key={alert.id}
                href={`/alerts/${alert.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">{getAlertIcon(alert.type)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAlertTypeText(alert.type)}</p>
                      <p className="text-sm text-gray-600">{alert.description.substring(0, 50)}...</p>
                      <div className="flex items-center mt-1">
                        <div className={`w-2 h-2 rounded-full ${getLevelColor(alert.level)} mr-1`}></div>
                        <span className="text-xs text-gray-500">Nivel {getLevelText(alert.level)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Hace 1h</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {alert.votes?.length || 0}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
