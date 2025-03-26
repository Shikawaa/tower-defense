import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GameCanvas from './GameCanvas'

export default function TowerDefense() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  const startGame = () => {
    setIsPlaying(true)
    setIsGameOver(false)
  }

  const handleGameOver = () => {
    setIsPlaying(false)
    setIsGameOver(true)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <AnimatePresence>
        {!isPlaying ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold mb-8 text-blue-500">Tower Defense</h1>
            {!isGameOver ? (
              <button
                onClick={startGame}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Commencer la partie
              </button>
            ) : (
              <div>
                <h2 className="text-2xl mb-4 text-red-500">Game Over</h2>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Rejouer
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameCanvas onGameOver={handleGameOver} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 