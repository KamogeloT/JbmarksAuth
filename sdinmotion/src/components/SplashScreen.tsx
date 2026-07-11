import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'logo' | 'powered' | 'done'>('logo');

  useEffect(() => {
    // Faster splash — 1.5s logo, 1s powered by, then done
    const timer1 = setTimeout(() => setStage('powered'), 1500);
    const timer2 = setTimeout(() => { setStage('done'); onFinish(); }, 2500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  if (stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#4CAF50] overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-white animate-pulse" />
        <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full border border-white animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full border border-white animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with entrance animation */}
        <div className="splash-logo mb-6">
          <img
            src="/assets/images/logos/JBMArkslogo.png"
            alt="JB Marks Local Municipality"
            className="h-28 w-auto drop-shadow-2xl"
          />
        </div>

        {/* App name with gold accent */}
        <h1 className="splash-title text-white text-2xl font-extrabold tracking-wide mb-1">
          JB MARKS
        </h1>
        <p className="splash-subtitle text-[#F9A825] text-sm font-bold tracking-widest uppercase mb-8">
          Community Reporter
        </p>

        {/* Progress bar */}
        <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="splash-progress h-full bg-[#F9A825] rounded-full" />
        </div>

        {/* Powered by — fades in at stage 2 */}
        <div className={`mt-8 flex flex-col items-center transition-all duration-500 ${stage === 'powered' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="text-white/60 text-xs mb-2">Powered by</span>
          <img
            src="/assets/images/logos/SdinMotionlogo.png"
            alt="SDinMotion"
            className="h-8 w-auto opacity-90"
          />
        </div>
      </div>

      <style>{`
        .splash-logo {
          animation: logoIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .splash-title {
          animation: fadeUp 0.5s ease-out 0.3s forwards;
          opacity: 0;
        }
        .splash-subtitle {
          animation: fadeUp 0.5s ease-out 0.5s forwards;
          opacity: 0;
        }
        .splash-progress {
          animation: progressFill 2.5s ease-in-out forwards;
        }
        @keyframes logoIn {
          from { opacity: 0; transform: scale(0.5) rotate(-5deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
