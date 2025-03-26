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
    constructor(width, height) {
      this.width = width
      this.height = height
      this.cellSize = 100
      this.path = this.createPath()
      this.buildableAreas = this.createBuildableAreas()
    }

    createPath() {
      const path = []
      for (let i = 0; i < 8; i++) {
        path.push({ x: i, y: 3 })
      }
      for (let i = 3; i < 6; i++) {
        path.push({ x: 7, y: i })
      }
      for (let i = 7; i >= 0; i--) {
        path.push({ x: i, y: 5 })
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
    constructor(path) {
      this.path = path
      this.currentPathIndex = 0
      this.x = path[0].x * 100
      this.y = path[0].y * 100
      this.speed = 4
      this.health = 100
      this.maxHealth = 100
      this.slowEffect = 0
    }

    move() {
      const targetPoint = this.path[this.currentPathIndex]
      const targetX = targetPoint.x * 100
      const targetY = targetPoint.y * 100

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
    const grid = new Grid(8, 6)
    let gameLoop

    const spawnEnemy = () => {
      if (!gameState.isPaused) {
        gameRef.current.enemies.push(new Enemy(grid.path))
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
          ctx.strokeRect(i * grid.cellSize, j * grid.cellSize, grid.cellSize, grid.cellSize)
        }
      }

      // Dessiner le chemin
      ctx.strokeStyle = '#475569'
      ctx.beginPath()
      ctx.moveTo(grid.path[0].x * grid.cellSize + grid.cellSize / 2, grid.path[0].y * grid.cellSize + grid.cellSize / 2)
      for (let i = 1; i < grid.path.length; i++) {
        ctx.lineTo(grid.path[i].x * grid.cellSize + grid.cellSize / 2, grid.path[i].y * grid.cellSize + grid.cellSize / 2)
      }
      ctx.stroke()

      // Dessiner les zones constructibles
      grid.buildableAreas.forEach(area => {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.2)'
        ctx.fillRect(area.x * grid.cellSize, area.y * grid.cellSize, grid.cellSize, grid.cellSize)
      })

      // Effet de survol
      if (gameRef.current.hoveredCell && grid.isBuildable(gameRef.current.hoveredCell.x, gameRef.current.hoveredCell.y)) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.fillRect(gameRef.current.hoveredCell.x * grid.cellSize, gameRef.current.hoveredCell.y * grid.cellSize, grid.cellSize, grid.cellSize)
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
        ctx.arc(enemy.x + grid.cellSize / 2, enemy.y + grid.cellSize / 2, 30, 0, Math.PI * 2)
        ctx.fill()

        // Barre de vie
        ctx.fillStyle = '#22c55e'
        ctx.fillRect(enemy.x, enemy.y - 20, (enemy.health / enemy.maxHealth) * grid.cellSize, 10)
      })

      // Dessiner les tours
      gameRef.current.towers.forEach(tower => {
        // Zone d'effet
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'
        ctx.beginPath()
        ctx.arc(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2, tower.stats.range, 0, Math.PI * 2)
        ctx.stroke()

        // Base de la tour
        ctx.fillStyle = '#1e293b'
        ctx.beginPath()
        ctx.arc(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2, 45, 0, Math.PI * 2)
        ctx.fill()

        // Corps de la tour
        ctx.fillStyle = getTowerColor(tower.type)
        ctx.beginPath()
        ctx.arc(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2, 35, 0, Math.PI * 2)
        ctx.fill()

        // Sommet de la tour
        ctx.fillStyle = '#e2e8f0'
        ctx.beginPath()
        ctx.arc(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2, 15, 0, Math.PI * 2)
        ctx.fill()

        // Effet de tir
        if (tower.cooldown === 0) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
          ctx.beginPath()
          ctx.arc(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2, 20, 0, Math.PI * 2)
          ctx.fill()
        }

        // Laser
        if (tower.type === 'laser' && tower.laserTarget) {
          ctx.strokeStyle = '#f43f5e'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(tower.x + grid.cellSize / 2, tower.y + grid.cellSize / 2)
          ctx.lineTo(tower.laserTarget.x + grid.cellSize / 2, tower.laserTarget.y + grid.cellSize / 2)
          ctx.stroke()
          ctx.lineWidth = 1
        }
      })

      // HUD
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '30px Orbitron'
      ctx.fillText(`Money: $${gameState.money}`, 20, 40)
      ctx.fillText(`Lives: ${gameState.lives}`, 20, 80)
      ctx.fillText(`Wave: ${gameState.wave}`, 20, 120)
      
      // Info de la tour sélectionnée
      const towerInfo = getTowerInfo(gameState.selectedTowerType)
      ctx.fillText(`${towerInfo.name}: $${towerInfo.cost}`, 20, 160)

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
      const gridX = Math.floor(x / grid.cellSize)
      const gridY = Math.floor(y / grid.cellSize)
      gameRef.current.hoveredCell = { x: gridX, y: gridY }
    }

    const handleClick = (e) => {
      if (gameState.isPaused) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const gridX = Math.floor(x / grid.cellSize)
      const gridY = Math.floor(y / grid.cellSize)

      if (!grid.isBuildable(gridX, gridY)) return

      const towerExists = gameRef.current.towers.some(tower => 
        tower.x === gridX * grid.cellSize && tower.y === gridY * grid.cellSize
      )
      if (towerExists) return

      const towerInfo = getTowerInfo(gameState.selectedTowerType)
      if (gameState.money >= towerInfo.cost) {
        gameRef.current.towers.push(new Tower(gridX * grid.cellSize, gridY * grid.cellSize, gameState.selectedTowerType))
        setGameState(prev => ({ ...prev, money: prev.money - towerInfo.cost }))
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    gameStep()

    return () => {
      cancelAnimationFrame(gameLoop)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
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
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-2 border-slate-700"
      />
      <div className="absolute top-4 right-4 flex flex-col gap-2 bg-slate-800/80 p-4 rounded-lg">
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