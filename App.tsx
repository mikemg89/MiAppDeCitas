import { useState } from 'react';
import DiagnosticoScreen from './src/screens/DiagnosticoScreen';
import VerificacionScreen from './src/screens/VerificacionScreen';

// Navegación mínima por estado: cuando el MVP tenga más pantallas se
// reemplaza por Expo Router (ver docs/00-mvp-sin-presupuesto.md).
type Screen = 'diagnostico' | 'verificacion';

export default function App() {
  const [screen, setScreen] = useState<Screen>('diagnostico');

  if (screen === 'verificacion') {
    return <VerificacionScreen onBack={() => setScreen('diagnostico')} />;
  }

  return <DiagnosticoScreen onOpenVerification={() => setScreen('verificacion')} />;
}
