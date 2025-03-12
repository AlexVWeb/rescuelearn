import { motion } from 'framer-motion';

export const EcgLine = () => (
  <div className="absolute inset-x-0 top-2 h-3 overflow-hidden bg-gray-100">
    <svg 
      viewBox="0 0 800 20" 
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0,10 L80,10 Q85,10 87.5,10 T95,10 L100,10 L105,2 L110,18 L115,0 L120,20 L125,10 Q130,10 132.5,10 T140,10 L800,10"
        fill="none"
        stroke="#DC2626"
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1,
          x: [-800, 0]
        }}
        transition={{ 
          duration: 4,
          ease: "linear",
          repeat: Infinity
        }}
      />
      <motion.path
        d="M0,10 L80,10 Q85,10 87.5,10 T95,10 L100,10 L105,2 L110,18 L115,0 L120,20 L125,10 Q130,10 132.5,10 T140,10 L800,10"
        fill="none"
        stroke="#DC2626"
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: 1,
          x: [0, 800]
        }}
        transition={{ 
          duration: 4,
          ease: "linear",
          repeat: Infinity
        }}
      />
    </svg>
  </div>
); 