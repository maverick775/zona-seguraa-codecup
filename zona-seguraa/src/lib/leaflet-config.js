// lib/leaflet-config.js
// Importar este archivo UNA SOLA VEZ en el componente StadiumMap
// Corrige los íconos de Leaflet que se rompen con webpack en Next.js

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix de íconos: webpack no puede resolver las imágenes de leaflet por defecto
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default L

