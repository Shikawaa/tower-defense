import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCanvas from './GameCanvas';

const TowerDefense = () => {
  const [gameState, setGameState] = useState({
    isPlaying: false,
    isGameOver: false
  });

  const startGame = () => {
    setGameState({ isPlaying: true, isGameOver: false });
  };

  const restartGame = () => {
    setGameState({ isPlaying: true, isGameOver: false });
  };

  const handleGameOver = () => {
    setGameState({ isPlaying: false, isGameOver: true });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <AnimatePresence>
        {!gameState.isPlaying ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen"
          >
            <h1 className="text-6xl font-bold text-red-600 mb-8">Tower Defense</h1>
            <div className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="px-8 py-4 text-2xl font-bold text-white bg-red-900 rounded-lg 
                         border-2 border-red-600 hover:border-red-400 hover:shadow-lg 
                         hover:shadow-red-500/50 transition-all duration-300"
              >
                {gameState.isGameOver ? 'Play Again' : 'Start Game'}
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center"
          >
            <GameCanvas onGameOver={handleGameOver} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TowerDefense; 