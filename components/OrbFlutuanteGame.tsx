import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Accelerometer } from 'expo-sensors';

const { width, height } = Dimensions.get('window');
const PLAYER_SIZE = 50;
const ORB_SIZE = 30;

const generateRandomPosition = () => ({
  x: Math.random() * (width - ORB_SIZE),
  y: Math.random() * (height - ORB_SIZE),
});

export interface OrbFlutuanteProps {
  gameActive: boolean;
  onCollect: () => void;
  resetTrigger: number;
}

export default function OrbFlutuanteGame({ gameActive, onCollect, resetTrigger }: OrbFlutuanteProps) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [playerPosition, setPlayerPosition] = useState({ x: width / 2, y: height / 2 });
  const [orbPosition, setOrbPosition] = useState(generateRandomPosition());

  // Reset do jogo
  useEffect(() => {
    setPlayerPosition({ x: width / 2, y: height / 2 });
    setOrbPosition(generateRandomPosition());
  }, [resetTrigger]);

  // Acelerômetro
  useEffect(() => {
    if (!gameActive) {
      Accelerometer.setUpdateInterval(0);
      return;
    }
    Accelerometer.setUpdateInterval(16);
    const sub = Accelerometer.addListener(acc => setData(acc));
    return () => {
      sub.remove();
      Accelerometer.setUpdateInterval(0);
    };
  }, [gameActive]);

  // Movimento do jogador
  useEffect(() => {
    if (!gameActive) return;

    let newX = playerPosition.x + data.x * -15;
    const sensitivityY = data.y < 0 ? 25 : 15;
    let newY = playerPosition.y + data.y * sensitivityY;

    // Limites da tela
    if (newX < 0) newX = 0;
    if (newX > width - PLAYER_SIZE) newX = width - PLAYER_SIZE;
    if (newY < 0) newY = 0;
    if (newY > height - PLAYER_SIZE) newY = height - PLAYER_SIZE;

    setPlayerPosition({ x: newX, y: newY });
  }, [data, gameActive]);

  // Colisão com o orbe
  useEffect(() => {
    if (!gameActive) return;

    const dx = (playerPosition.x + PLAYER_SIZE/2) - (orbPosition.x + ORB_SIZE/2);
    const dy = (playerPosition.y + PLAYER_SIZE/2) - (orbPosition.y + ORB_SIZE/2);
    const distance = Math.sqrt(dx*dx + dy*dy);

    if (distance < PLAYER_SIZE - ORB_SIZE) {
      setOrbPosition(generateRandomPosition());
      onCollect();
    }
  }, [playerPosition, gameActive]);

  return (
    <View style={styles.container}>
      <View style={[styles.orb, { left: orbPosition.x, top: orbPosition.y }]} />
      <View style={[styles.player, { left: playerPosition.x, top: playerPosition.y }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE/2,
    backgroundColor: 'coral',
    borderWidth: 2,
    borderColor: '#fff',
  },
  orb: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE/2,
    backgroundColor: '#3498db',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
