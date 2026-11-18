import React from 'react';
import { BelbinVisualizer } from './components/BelbinVisualizer';
import { SAMPLE_BELBIN_TRACE } from './mock/sampleSimulation';

export const App: React.FC = () => {
  return (
    <BelbinVisualizer
      trace={SAMPLE_BELBIN_TRACE}
      title="Sesión de Planificación Estratégica"
      subtitle="Simulación de toma de decisiones bajo perfiles de equipo Belbin"
    />
  );
};

export default App;
