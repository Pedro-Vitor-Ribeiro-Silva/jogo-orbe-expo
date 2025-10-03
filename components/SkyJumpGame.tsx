import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import { Accelerometer } from 'expo-sensors';

// --- CONFIGURAÇÕES DO JOGO ---
const GAME_CONFIG = {
  INVERT_HORIZONTAL_AXIS: false, 
  PLAYER_SIZE: 50,
  PLATFORM_HEIGHT: 15,
  GRAVITY: 0.5,
  JUMP_FORCE: -15,
  SPRING_JUMP_FORCE: -30,
  PLATFORM_SPACING: 150,
  HORIZONTAL_SPEED: 15,
  SCORE_TO_CHANGE_BG: 50,
  MOVING_PLATFORM_BASE_SPEED: 2,
  SPRING_CHANCE: 0.03,
};
// --------------------------

const { width, height } = Dimensions.get('window');
const BACKGROUND_COLORS = ['#87CEEB', '#4682B4', '#1A2340', '#FFA07A'];

type PlatformType = 'normal' | 'moving' | 'breakable' | 'spring';

interface Platform {
  id: string | number; x: number; y: number; width: number;
  scored: boolean; type: PlatformType; direction: 1 | -1;
}

type Coordinates = { x: number; y: number };

const createPlatform = (y: number, currentScore: number, idSuffix = ''): Platform => {
  let type: PlatformType = 'normal';
  const random = Math.random();

  if (random < GAME_CONFIG.SPRING_CHANCE) {
    type = 'spring';
  } else if (currentScore > 40 && random < 0.20 + Math.min(0.4, (currentScore - 40) / 500)) {
    type = 'breakable';
  } else if (currentScore > 20 && random < 0.45) {
    type = 'moving';
  }

  return {
    id: Math.random() + idSuffix,
    x: Math.random() * (width - 100), y, width: 100, scored: false, type,
    direction: Math.random() > 0.5 ? 1 : -1,
  };
};

const Spring = () => <View style={styles.spring} />;

const Player = ({ position }: { position: Coordinates }) => (
  <View style={[styles.player, { left: position.x, top: position.y }]}>
    <View style={styles.playerEyesContainer}>
      <View style={styles.playerEye} /><View style={styles.playerEye} />
    </View>
  </View>
);

export interface SkyJumpGameProps {
  onGameOver: (score: number) => void;
}

export default function SkyJumpGame({ onGameOver }: SkyJumpGameProps) {
  const [playerPosition, setPlayerPosition] = useState<Coordinates>({ x: width / 2 - GAME_CONFIG.PLAYER_SIZE / 2, y: height - 100 });
  const [velocityY, setVelocityY] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>(() => [
    { id: 'start-floor', x: 0, y: height - 40, width: width, scored: true, type: 'normal', direction: 1 },
    ...Array.from({ length: 7 }, (_, i) => createPlatform(height - 40 - (i + 1) * GAME_CONFIG.PLATFORM_SPACING, 0, `initial-${i}`))
  ]);
  const [score, setScore] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
  const accelerometerData = useRef({ x: 0 }).current;
  const gameIsOver = useRef(false);

  useEffect(() => {
    let subscription: { remove: () => void; };
    const startListening = async () => {
      await Accelerometer.setUpdateInterval(16);
      subscription = Accelerometer.addListener(data => {
        accelerometerData.x = data.x;
      });
    };
    startListening();
    return () => subscription?.remove();
  }, [accelerometerData]);

  useEffect(() => {
    const bgIndex = Math.floor(score / GAME_CONFIG.SCORE_TO_CHANGE_BG) % BACKGROUND_COLORS.length;
    setBackgroundColor(BACKGROUND_COLORS[bgIndex]);
  }, [score]);

  const gameLoop = useCallback(() => {
    if (gameIsOver.current) return;

    setPlatforms(prev => prev.map(p => {
      const isMoving = p.type === 'moving' || (p.type === 'breakable' && score >= 200);
      if (isMoving) {
        let speed = GAME_CONFIG.MOVING_PLATFORM_BASE_SPEED + (score > 120 ? (score - 120) * 0.02 : 0);
        let newX = p.x + p.direction * speed;
        if (newX < 0 || newX + p.width > width) p.direction *= -1;
        return { ...p, x: newX };
      }
      return p;
    }));

    setPlayerPosition(pPos => {
      let newVelocityY = velocityY + GAME_CONFIG.GRAVITY;
      const didJumpRef = { current: false };

      const updatedPlatforms = platforms.map(platform => {
        if (newVelocityY > 0 &&
            (pPos.y + GAME_CONFIG.PLAYER_SIZE) >= platform.y &&
            (pPos.y + GAME_CONFIG.PLAYER_SIZE) <= (platform.y + GAME_CONFIG.PLATFORM_HEIGHT + 10) &&
            (pPos.x + accelerometerData.x * GAME_CONFIG.HORIZONTAL_SPEED + GAME_CONFIG.PLAYER_SIZE) > platform.x &&
            (pPos.x + accelerometerData.x * GAME_CONFIG.HORIZONTAL_SPEED) < (platform.x + platform.width)
        ) {
          didJumpRef.current = true;
          newVelocityY = platform.type === 'spring' ? GAME_CONFIG.SPRING_JUMP_FORCE : GAME_CONFIG.JUMP_FORCE;

          if (platform.type === 'breakable') {
            setTimeout(() => setPlatforms(prev => prev.filter(p => p.id !== platform.id)), 50);
          }
        }
        return platform;
      });

      setVelocityY(newVelocityY);

      let newY = pPos.y + newVelocityY;
      let newX = pPos.x + accelerometerData.x * GAME_CONFIG.HORIZONTAL_SPEED * (GAME_CONFIG.INVERT_HORIZONTAL_AXIS ? -1 : 1);
      
      const platformsToScore = updatedPlatforms.filter(p => !p.scored && newY < p.y);
      if (platformsToScore.length > 0) {
        setScore(s => s + platformsToScore.length);
        const idsToUpdate = platformsToScore.map(p => p.id);
        setPlatforms(prev => prev.map(p => idsToUpdate.includes(p.id) ? { ...p, scored: true } : p));
      }

      if (newX > width) newX = -GAME_CONFIG.PLAYER_SIZE;
      if (newX < -GAME_CONFIG.PLAYER_SIZE) newX = width;
      
      if (newY < height / 2) {
          const yOffset = height / 2 - newY;
          newY += yOffset;
          setPlatforms(prev => prev.map(p => ({ ...p, y: p.y + yOffset })));
      }

      if (newY > height) {
        gameIsOver.current = true;
        onGameOver(score);
        return pPos;
      }
      
      // CORREÇÃO: Remove plataformas assim que saem da parte inferior da tela
      setPlatforms(prev => {
        const highest = prev.reduce((p, c) => (p.y < c.y ? p : c), prev[0]);
        // A condição `p.y < height` garante que plataformas abaixo da tela sejam removidas
        let newPlats = prev.filter(p => p.y < height); 
        if (highest && highest.y > 0 && newPlats.length < 8) {
          newPlats.push(createPlatform(highest.y - GAME_CONFIG.PLATFORM_SPACING, score));
        }
        return newPlats;
      });

      return { x: newX, y: newY };
    });
  }, [accelerometerData, onGameOver, score, velocityY, platforms]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameLoop]);

  const getPlatformStyle = (platform: Platform) => {
    const style: any = { left: platform.x, top: platform.y, width: platform.width };
    switch (platform.type) {
      case 'breakable': style.backgroundColor = '#f0f0f0'; style.borderColor = '#555'; break;
      case 'moving':
      case 'normal': style.backgroundColor = '#2E8B57'; style.borderColor = '#fff'; break;
      case 'spring': style.backgroundColor = '#f1c40f'; style.borderColor = '#fff'; break;
    }
    return style;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={styles.scoreText}>{score}</Text>
      <Player position={playerPosition} />
      {platforms.map(platform => (
        <View key={platform.id} style={[styles.platform, getPlatformStyle(platform)]}>
          {platform.type === 'spring' && <Spring />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  scoreText: {
    position: 'absolute', top: 50, left: 0, right: 0,
    textAlign: 'center', fontSize: 48, fontWeight: 'bold',
    color: 'white', zIndex: 1, textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5,
  },
  player: {
    position: 'absolute', width: GAME_CONFIG.PLAYER_SIZE, height: GAME_CONFIG.PLAYER_SIZE,
    borderRadius: GAME_CONFIG.PLAYER_SIZE / 2, backgroundColor: '#D2691E',
    borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
  },
  playerEyesContainer: { flexDirection: 'row' },
  playerEye: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'white', marginHorizontal: 4,
    borderColor: 'black', borderWidth: 1,
  },
  platform: {
    position: 'absolute', height: GAME_CONFIG.PLATFORM_HEIGHT,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 5, borderBottomColor: 'rgba(0,0,0,0.2)'
  },
  spring: {
    width: 20, height: 10,
    backgroundColor: '#c0392b', borderRadius: 2,
  }
});