import { useEffect, useRef, useState } from 'react';

const GameCanvas = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    money: 100,
    lives: 10,
    wave: 1,
    isGameOver: false,
    isPaused: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let lastTime = 0;

    // Définir la taille du canvas
    canvas.width = 800;
    canvas.height = 600;

    // Classe pour gérer la grille du jeu
    class Grid {
      constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.grid = [];
        this.initializeGrid();
      }

      initializeGrid() {
        for (let y = 0; y < this.height; y++) {
          this.grid[y] = [];
          for (let x = 0; x < this.width; x++) {
            this.grid[y][x] = {
              x: x * this.cellSize,
              y: y * this.cellSize,
              isPath: false,
              isBuildable: true
            };
          }
        }
        this.createPath();
      }

      createPath() {
        // Créer un chemin prédéfini
        const path = [
          { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 },
          { x: 2, y: 4 }, { x: 2, y: 5 },
          { x: 3, y: 5 }, { x: 4, y: 5 },
          { x: 4, y: 4 }, { x: 4, y: 3 },
          { x: 5, y: 3 }, { x: 6, y: 3 }, { x: 7, y: 3 }
        ];

        path.forEach(point => {
          this.grid[point.y][point.x].isPath = true;
          this.grid[point.y][point.x].isBuildable = false;
        });
      }

      draw(ctx) {
        // Dessiner la grille
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const cell = this.grid[y][x];
            ctx.strokeStyle = '#333';
            ctx.strokeRect(cell.x, cell.y, this.cellSize, this.cellSize);

            if (cell.isPath) {
              ctx.fillStyle = '#4a4a4a';
              ctx.fillRect(cell.x, cell.y, this.cellSize, this.cellSize);
            }
          }
        }
      }
    }

    // Classe pour les ennemis
    class Enemy {
      constructor(path) {
        this.path = path;
        this.currentPathIndex = 0;
        this.x = path[0].x * 100;
        this.y = path[0].y * 100;
        this.speed = 1;
        this.health = 100;
        this.maxHealth = 100;
      }

      update() {
        const targetPoint = this.path[this.currentPathIndex];
        const targetX = targetPoint.x * 100;
        const targetY = targetPoint.y * 100;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.speed) {
          this.currentPathIndex++;
          if (this.currentPathIndex >= this.path.length) {
            return true; // L'ennemi a atteint la fin
          }
        } else {
          this.x += (dx / distance) * this.speed;
          this.y += (dy / distance) * this.speed;
        }

        return false;
      }

      draw(ctx) {
        // Dessiner l'ennemi
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x + 50, this.y + 50, 20, 0, Math.PI * 2);
        ctx.fill();

        // Barre de vie
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 10, this.y + 10, 80, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + 10, this.y + 10, (this.health / this.maxHealth) * 80, 5);
      }
    }

    // Classe pour les tours
    class Tower {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.range = 150;
        this.damage = 20;
        this.attackSpeed = 1;
        this.lastShot = 0;
      }

      draw(ctx) {
        // Dessiner la tour
        ctx.fillStyle = '#4444ff';
        ctx.fillRect(this.x + 20, this.y + 20, 60, 60);

        // Dessiner la portée
        ctx.strokeStyle = 'rgba(68, 68, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(this.x + 50, this.y + 50, this.range, 0, Math.PI * 2);
        ctx.stroke();
      }

      shoot(enemies, currentTime) {
        if (currentTime - this.lastShot < 1000 / this.attackSpeed) return;

        for (const enemy of enemies) {
          const dx = enemy.x + 50 - (this.x + 50);
          const dy = enemy.y + 50 - (this.y + 50);
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= this.range) {
            enemy.health -= this.damage;
            this.lastShot = currentTime;
            return;
          }
        }
      }
    }

    // Initialisation du jeu
    const grid = new Grid(8, 6, 100);
    const enemies = [];
    const towers = [];
    let lastEnemySpawn = 0;

    // Fonction de rendu
    const render = (currentTime) => {
      if (!gameState.isPaused && !gameState.isGameOver) {
        // Effacer le canvas
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dessiner la grille
        grid.draw(ctx);

        // Mettre à jour et dessiner les ennemis
        for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (enemy.update()) {
            enemies.splice(i, 1);
            setGameState(prev => ({ ...prev, lives: prev.lives - 1 }));
            continue;
          }
          if (enemy.health <= 0) {
            enemies.splice(i, 1);
            setGameState(prev => ({ ...prev, money: prev.money + 10 }));
            continue;
          }
          enemy.draw(ctx);
        }

        // Dessiner les tours
        towers.forEach(tower => {
          tower.draw(ctx);
          tower.shoot(enemies, currentTime);
        });

        // Spawn d'ennemis
        if (currentTime - lastEnemySpawn > 2000) {
          enemies.push(new Enemy(grid.grid[3].map(cell => ({ x: cell.x / 100, y: 3 }))));
          lastEnemySpawn = currentTime;
        }
      }

      // Dessiner le HUD
      ctx.fillStyle = '#fff';
      ctx.font = '20px Arial';
      ctx.fillText(`Money: $${gameState.money}`, 10, 30);
      ctx.fillText(`Lives: ${gameState.lives}`, 10, 60);
      ctx.fillText(`Wave: ${gameState.wave}`, 10, 90);

      if (gameState.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Gestionnaire de clic pour placer les tours
    const handleClick = (event) => {
      if (gameState.isPaused || gameState.isGameOver) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const gridX = Math.floor(x / 100);
      const gridY = Math.floor(y / 100);

      if (grid.grid[gridY] && grid.grid[gridY][gridX] && grid.grid[gridY][gridX].isBuildable) {
        if (gameState.money >= 50) {
          towers.push(new Tower(gridX * 100, gridY * 100));
          setGameState(prev => ({ ...prev, money: prev.money - 50 }));
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    render(0);

    return () => {
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="border-2 border-red-800 rounded-lg"
      />
      <div className="absolute top-4 right-4 space-x-4">
        <button
          onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {gameState.isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
    </div>
  );
};

export default GameCanvas; 