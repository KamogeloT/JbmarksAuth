import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'jbmarks' | 'sdinmotion' | 'done'>('jbmarks');

  useEffect(() => {
    // Show JBmarks logo for 2 seconds
    const timer1 = setTimeout(() => {
      setStage('sdinmotion');
    }, 2000);

    // Show SDINMOTION for 2 seconds, then finish
    const timer2 = setTimeout(() => {
      setStage('done');
      onFinish();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  if (stage === 'done') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary-light">
      {/* JBmarks Logo Stage */}
      {stage === 'jbmarks' && (
        <div
          className="animate-fade-in flex flex-col items-center"
          style={{
            animation: 'fadeIn 0.5s ease-in',
          }}
        >
          <img
            src="/assets/images/logos/JBMArkslogo.png"
            alt="JBmarks Local Municipality"
            className="h-32 w-auto mb-4"
          />
          <div className="h-1 w-24 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full animate-progress"
              style={{
                animation: 'progress 2s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* SDINMOTION Stage */}
      {stage === 'sdinmotion' && (
        <div
          className="animate-fade-in flex flex-col items-center"
          style={{
            animation: 'fadeIn 0.5s ease-in',
          }}
        >
          <div className="text-white text-lg font-semibold mb-4">
            Powered by
          </div>
          <img
            src="/assets/images/logos/SdinMotionlogo.png"
            alt="SDINMOTION"
            className="h-20 w-auto"
          />
          <div className="h-1 w-24 bg-white/30 rounded-full overflow-hidden mt-6">
            <div
              className="h-full bg-white rounded-full animate-progress"
              style={{
                animation: 'progress 2s linear',
              }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

