import { useEffect, useRef, useState } from 'react'

const GameCanvas = ({ onGameOver }) => {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState({
    money: 100,
    lives: 10,
    wave: 1,
    isPaused: false,
    selectedTowerType: 'shooter'
  })
  const gameRef = useRef({
    enemies: [],
    towers: [],
    frameCount: 0,
    hoveredCell: null
  })

  class Grid {
    constructor(width, height, cellSize) {
      this.width = width
      this.height = height
      this.cellSize = cellSize
      this.path = this.createPath()
      this.buildableAreas = this.createBuildableAreas()
    }

    createPath() {
      const path = []
      // Premier chemin (en haut)
      for (let i = 0; i < 12; i++) {
        path.push({ x: i, y: 2 })
      }
      for (let i = 2; i < 6; i++) {
        path.push({ x: 11, y: i })
      }
      for (let i = 11; i >= 0; i--) {
        path.push({ x: i, y: 5 })
      }

      // Deuxième chemin (en bas)
      for (let i = 0; i < 12; i++) {
        path.push({ x: i, y: 8 })
      }
      for (let i = 8; i < 12; i++) {
        path.push({ x: 11, y: i })
      }
      for (let i = 11; i >= 0; i--) {
        path.push({ x: i, y: 11 })
      }

      return path
    }

    createBuildableAreas() {
      const areas = []
      for (let i = 0; i < this.width; i++) {
        for (let j = 0; j < this.height; j++) {
          if (!this.path.some(point => point.x === i && point.y === j)) {
            areas.push({ x: i, y: j })
          }
        }
      }
      return areas
    }

    isBuildable(x, y) {
      return this.buildableAreas.some(area => area.x === x && area.y === y)
    }
  }

  class Enemy {
    constructor(path, cellSize, startIndex = 0) {
      this.path = path
      this.cellSize = cellSize
      this.currentPathIndex = startIndex
      this.x = path[startIndex].x * cellSize
      this.y = path[startIndex].y * cellSize
      this.speed = 4
      this.health = 100
      this.maxHealth = 100
      this.slowEffect = 0
    }

    move() {
      const targetPoint = this.path[this.currentPathIndex]
      const targetX = targetPoint.x * this.cellSize
      const targetY = targetPoint.y * this.cellSize

      const dx = targetX - this.x
      const dy = targetY - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < this.speed) {
        this.currentPathIndex++
        if (this.currentPathIndex >= this.path.length) {
          return true
        }
        return false
      }

      const currentSpeed = this.speed * (1 - this.slowEffect)
      this.x += (dx / distance) * currentSpeed
      this.y += (dy / distance) * currentSpeed
      return false
    }
  }

  class Projectile {
    constructor(x, y, target, damage, speed = 8) {
      this.x = x
      this.y = y
      this.target = target
      this.damage = damage
      this.speed = speed
    }

    move() {
      const dx = this.target.x - this.x
      const dy = this.target.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 30) {
        return true
      }

      this.x += (dx / distance) * this.speed
      this.y += (dy / distance) * this.speed
      return false
    }
  }

  class Tower {
    constructor(x, y, type) {
      this.x = x
      this.y = y
      this.type = type
      this.level = 1
      this.stats = this.getStats()
      this.cooldown = 0
      this.projectiles = []
      this.laserTarget = null
    }

    getStats() {
      switch (this.type) {
        case 'shooter':
          return {
            damage: 20,
            range: 250,
            fireRate: 20,
            cost: 50
          }
        case 'slow':
          return {
            damage: 0,
            range: 200,
            fireRate: 30,
            slowAmount: 0.5,
            cost: 75
          }
        case 'bomb':
          return {
            damage: 50,
            range: 250,
            fireRate: 60,
            splashRadius: 100,
            cost: 100
          }
        case 'laser':
          return {
            damage: 2,
            range: 350,
            fireRate: 7,
            cost: 125
          }
        default:
          return {
            damage: 15,
            range: 300,
            fireRate: 10,
            cost: 50
          }
      }
    }

    findClosestEnemy(enemies) {
      let closest = null
      let minDistance = Infinity

      enemies.forEach(enemy => {
        const dx = enemy.x - (this.x + 50)
        const dy = enemy.y - (this.y + 50)
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance <= this.stats.range && distance < minDistance) {
          closest = enemy
          minDistance = distance
        }
      })

      return closest
    }

    shoot(enemies) {
      if (this.cooldown > 0) {
        this.cooldown--
        return
      }

      if (this.type === 'laser') {
        const target = this.findClosestEnemy(enemies)
        if (target) {
          this.laserTarget = target
          target.health -= this.stats.damage
          if (target.health <= 0) {
            setGameState(prev => ({ ...prev, money: prev.money + 10 }))
          }
        } else {
          this.laserTarget = null
        }
        return
      }

      const target = this.findClosestEnemy(enemies)
      if (target) {
        const startX = this.x + 50
        const startY = this.y + 50
        this.projectiles.push(new Projectile(
          startX,
          startY,
          target,
          this.stats.damage,
          this.type === 'bomb' ? 5 : (this.type === 'shooter' ? 12 : 8)
        ))
        this.cooldown = this.stats.fireRate
      }
    }

    applyEffect(enemy) {
      if (this.type === 'slow') {
        enemy.slowEffect = this.stats.slowAmount
        setTimeout(() => {
          enemy.slowEffect = 0
        }, 3000)
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Calculer la taille des cellules en fonction de la taille de l'écran
    const calculateCellSize = () => {
      const maxWidth = window.innerWidth - 200 // Réserver de l'espace pour les boutons
      const maxHeight = window.innerHeight - 40 // Réserver de l'espace pour les marges
      const cellSize = Math.min(
        Math.floor(maxWidth / 12),
        Math.floor(maxHeight / 12),
        80, // Taille maximale des cellules
        60  // Taille minimale des cellules
      )
      return cellSize
    }

    const cellSize = calculateCellSize()
    const grid = new Grid(12, 12, cellSize)
    
    // Mettre à jour la taille du canvas
    canvas.width = cellSize * 12
    canvas.height = cellSize * 12

    let gameLoop

    const spawnEnemy = () => {
      if (!gameState.isPaused) {
        // Spawn aléatoire entre les deux chemins
        const startIndex = Math.random() < 0.5 ? 0 : grid.path.length / 2
        gameRef.current.enemies.push(new Enemy(grid.path, cellSize, startIndex))
      }
    }

    const updateGame = () => {
      if (gameState.isPaused) return

      gameRef.current.frameCount++
      if (gameRef.current.frameCount % 60 === 0) {
        spawnEnemy()
      }

      // Mise à jour des ennemis
      gameRef.current.enemies = gameRef.current.enemies.filter(enemy => {
        const reachedEnd = enemy.move()
        if (reachedEnd) {
          setGameState(prev => ({ ...prev, lives: prev.lives - 1 }))
          if (gameState.lives <= 1) {
            onGameOver()
          }
          return false
        }
        return true
      })

      // Mise à jour des tours
      gameRef.current.towers.forEach(tower => {
        tower.shoot(gameRef.current.enemies)
        
        // Mise à jour des projectiles
        tower.projectiles = tower.projectiles.filter(projectile => {
          const hit = projectile.move()
          if (hit) {
            if (tower.type === 'bomb') {
              // Effet de splash pour la tour bomb
              gameRef.current.enemies.forEach(enemy => {
                const dx = enemy.x - projectile.target.x
                const dy = enemy.y - projectile.target.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                if (distance <= tower.stats.splashRadius) {
                  enemy.health -= projectile.damage
                  if (enemy.health <= 0) {
                    setGameState(prev => ({ ...prev, money: prev.money + 10 }))
                  }
                }
              })
            } else {
              // Vérifier si l'ennemi est toujours en vie avant d'appliquer les dégâts
              if (projectile.target.health > 0) {
                projectile.target.health -= projectile.damage
                tower.applyEffect(projectile.target)
                if (projectile.target.health <= 0) {
                  setGameState(prev => ({ ...prev, money: prev.money + 10 }))
                }
              }
            }
            return false
          }
          return true
        })
      })

      // Suppression des ennemis morts
      gameRef.current.enemies = gameRef.current.enemies.filter(enemy => enemy.health > 0)
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Dessiner la grille
      ctx.strokeStyle = '#1e293b'
      for (let i = 0; i < grid.width; i++) {
        for (let j = 0; j < grid.height; j++) {
          ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }

      // Dessiner le chemin
      ctx.strokeStyle = '#475569'
      ctx.beginPath()
      ctx.moveTo(grid.path[0].x * cellSize + cellSize / 2, grid.path[0].y * cellSize + cellSize / 2)
      for (let i = 1; i < grid.path.length; i++) {
        ctx.lineTo(grid.path[i].x * cellSize + cellSize / 2, grid.path[i].y * cellSize + cellSize / 2)
      }
      ctx.stroke()

      // Dessiner les zones constructibles
      grid.buildableAreas.forEach(area => {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.2)'
        ctx.fillRect(area.x * cellSize, area.y * cellSize, cellSize, cellSize)
      })

      // Effet de survol
      if (gameRef.current.hoveredCell && grid.isBuildable(gameRef.current.hoveredCell.x, gameRef.current.hoveredCell.y)) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.fillRect(gameRef.current.hoveredCell.x * cellSize, gameRef.current.hoveredCell.y * cellSize, cellSize, cellSize)
      }

      // Dessiner les projectiles
      gameRef.current.towers.forEach(tower => {
        tower.projectiles.forEach(projectile => {
          ctx.fillStyle = '#3b82f6'
          ctx.beginPath()
          ctx.arc(projectile.x, projectile.y, 3, 0, Math.PI * 2)
          ctx.fill()
        })
      })

      // Dessiner les ennemis
      gameRef.current.enemies.forEach(enemy => {
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(enemy.x + cellSize / 2, enemy.y + cellSize / 2, 30, 0, Math.PI * 2)
        ctx.fill()

        // Barre de vie
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(enemy.x, enemy.y - 20, (enemy.health / enemy.maxHealth) * cellSize, 10)
      })

      // Dessiner les tours
      gameRef.current.towers.forEach(tower => {
        // Zone d'effet
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'
        ctx.beginPath()
        ctx.arc(tower.x + cellSize / 2, tower.y + cellSize / 2, tower.stats.range, 0, Math.PI * 2)
        ctx.stroke()

        // Base de la tour
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(tower.x + cellSize / 2, tower.y + cellSize / 2, 45, 0, Math.PI * 2)
        ctx.fill()

        // Corps de la tour
        ctx.fillStyle = getTowerColor(tower.type)
        ctx.beginPath()
        ctx.arc(tower.x + cellSize / 2, tower.y + cellSize / 2, 35, 0, Math.PI * 2)
        ctx.fill()

        // Sommet de la tour
        ctx.fillStyle = '#e2e8f0'
        ctx.beginPath()
        ctx.arc(tower.x + cellSize / 2, tower.y + cellSize / 2, 15, 0, Math.PI * 2)
        ctx.fill()

        // Effet de tir
        if (tower.cooldown === 0) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
          ctx.beginPath()
          ctx.arc(tower.x + cellSize / 2, tower.y + cellSize / 2, 20, 0, Math.PI * 2)
          ctx.fill()
        }

        // Laser
        if (tower.type === 'laser' && tower.laserTarget) {
          ctx.strokeStyle = '#f43f5e'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(tower.x + cellSize / 2, tower.y + cellSize / 2)
          ctx.lineTo(tower.laserTarget.x + cellSize / 2, tower.laserTarget.y + cellSize / 2)
          ctx.stroke()
          ctx.lineWidth = 1
        }
      })

      // Texte de pause
      if (gameState.isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '60px Orbitron'
        ctx.textAlign = 'center'
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2)
        ctx.textAlign = 'left'
      }
    }

    const gameStep = () => {
      if (!gameState.isPaused) {
        updateGame()
      }
      render()
      gameLoop = requestAnimationFrame(gameStep)
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const gridX = Math.floor(x / cellSize)
      const gridY = Math.floor(y / cellSize)
      gameRef.current.hoveredCell = { x: gridX, y: gridY }
    }

    const handleClick = (e) => {
      if (gameState.isPaused) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const gridX = Math.floor(x / cellSize)
      const gridY = Math.floor(y / cellSize)

      if (!grid.isBuildable(gridX, gridY)) return

      const towerExists = gameRef.current.towers.some(tower => 
        tower.x === gridX * cellSize && tower.y === gridY * cellSize
      )
      if (towerExists) return

      const towerInfo = getTowerInfo(gameState.selectedTowerType)
      if (gameState.money >= towerInfo.cost) {
        gameRef.current.towers.push(new Tower(gridX * cellSize, gridY * cellSize, gameState.selectedTowerType))
        setGameState(prev => ({ ...prev, money: prev.money - towerInfo.cost }))
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    gameStep()

    // Ajouter un gestionnaire de redimensionnement
    const handleResize = () => {
      const newCellSize = calculateCellSize()
      if (newCellSize !== cellSize) {
        // Mettre à jour la taille du canvas
        canvas.width = newCellSize * 12
        canvas.height = newCellSize * 12
        
        // Mettre à jour la position des ennemis existants
        gameRef.current.enemies.forEach(enemy => {
          const currentPoint = enemy.path[enemy.currentPathIndex]
          enemy.cellSize = newCellSize
          // Mettre à jour la position en fonction du nouveau cellSize
          enemy.x = currentPoint.x * newCellSize
          enemy.y = currentPoint.y * newCellSize
        })

        // Mettre à jour la position des tours
        gameRef.current.towers.forEach(tower => {
          const gridX = Math.floor(tower.x / cellSize)
          const gridY = Math.floor(tower.y / cellSize)
          tower.x = gridX * newCellSize
          tower.y = gridY * newCellSize
        })
        
        render()
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(gameLoop)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      window.removeEventListener('resize', handleResize)
    }
  }, [gameState, onGameOver])

  const getTowerColor = (type) => {
    switch (type) {
      case 'shooter':
        return '#3b82f6'
      case 'bomb':
        return '#f43f5e'
      case 'laser':
        return '#f43f5e'
      case 'slow':
        return '#8b5cf6'
      default:
        return '#3b82f6'
    }
  }

  const getTowerInfo = (type) => {
    switch (type) {
      case 'shooter':
        return { name: 'Shooter Tower', cost: 50 }
      case 'bomb':
        return { name: 'Bomb Tower', cost: 100 }
      case 'laser':
        return { name: 'Laser Tower', cost: 125 }
      case 'slow':
        return { name: 'Slow Tower', cost: 75 }
      default:
        return { name: 'Shooter Tower', cost: 50 }
    }
  }

  const togglePause = () => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
  }

  const resetGame = () => {
    setGameState({
      money: 100,
      lives: 10,
      wave: 1,
      isPaused: false,
      selectedTowerType: 'shooter'
    })
    gameRef.current = {
      enemies: [],
      towers: [],
      frameCount: 0,
      hoveredCell: null
    }
  }

  const selectTowerType = (type) => {
    if (!gameState.isPaused) {
      setGameState(prev => ({ ...prev, selectedTowerType: type }))
    }
  }

  return (
    <div className="flex justify-between items-start gap-4 p-4">
      {/* Zone de texte à gauche */}
      <div className="flex flex-col gap-2 bg-slate-800/80 p-4 rounded-lg min-w-[200px]">
        <div className="text-white font-orbitron text-xl">
          Money: ${gameState.money}
        </div>
        <div className="text-white font-orbitron text-xl">
          Lives: {gameState.lives}
        </div>
        <div className="text-white font-orbitron text-xl">
          Wave: {gameState.wave}
        </div>
        <div className="text-white font-orbitron text-xl">
          {getTowerInfo(gameState.selectedTowerType).name}: ${getTowerInfo(gameState.selectedTowerType).cost}
        </div>
      </div>

      {/* Canvas au centre */}
      <div className="flex-shrink-0">
        <canvas
          ref={canvasRef}
          className="border-2 border-slate-700"
        />
      </div>

      {/* Boutons à droite */}
      <div className="flex flex-col gap-2 bg-slate-800/80 p-4 rounded-lg min-w-[200px]">
        <div className="flex flex-col gap-2">
          <button
            onClick={togglePause}
            className={`px-4 py-2 rounded ${
              gameState.isPaused
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            {gameState.isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Reset Game
          </button>
        </div>
        <div className="border-t border-slate-600 my-2"></div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => selectTowerType('shooter')}
            className={`px-4 py-2 rounded ${
              gameState.selectedTowerType === 'shooter'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            } ${gameState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={gameState.isPaused}
          >
            Shooter ($50)
          </button>
          <button
            onClick={() => selectTowerType('slow')}
            className={`px-4 py-2 rounded ${
              gameState.selectedTowerType === 'slow'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            } ${gameState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={gameState.isPaused}
          >
            Slow ($75)
          </button>
          <button
            onClick={() => selectTowerType('bomb')}
            className={`px-4 py-2 rounded ${
              gameState.selectedTowerType === 'bomb'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            } ${gameState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={gameState.isPaused}
          >
            Bomb ($100)
          </button>
          <button
            onClick={() => selectTowerType('laser')}
            className={`px-4 py-2 rounded ${
              gameState.selectedTowerType === 'laser'
                ? 'bg-pink-600 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            } ${gameState.isPaused ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={gameState.isPaused}
          >
            Laser ($125)
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameCanvas 