import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button } from "react-native";
import OrbFlutuanteGame from '@/components/OrbFlutuanteGame';

// Estados do Jogo
type GameState = 'home' | 'playing' | 'gameOver';
const GAME_TIME_SECONDS = 30;

// --- Componentes de Tela ---

const StartScreen = ({ onPlay }) => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>Jogo da bolinha</Text>
    <Text style={styles.instructions}>
      Seu objetivo é coletar o orbe azul em {GAME_TIME_SECONDS} segundos, cobrindo-o totalmente com a bola laranja!
    </Text>
    <Button title="JOGAR" onPress={onPlay} color="#3498db" />
  </View>
);

const GameOverScreen = ({ score, onPlayAgain }) => (
  <View style={styles.screenContainer}>
    <Text style={styles.title}>TEMPO ESGOTADO!</Text>
    <Text style={styles.scoreTextFinal}>Pontuação Final: {score}</Text>
    <Button title="JOGAR NOVAMENTE" onPress={onPlayAgain} color="#3498db" />
  </View>
);

// --- Componente Principal ---

export default function Index() {
  const [gameState, setGameState] = useState<GameState>('home');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME_SECONDS);
  const [resetTrigger, setResetTrigger] = useState(0); // Força reset no OrbFlutuante

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_TIME_SECONDS);
    setGameState('playing');
    setResetTrigger(prev => prev + 1);
  };

  const handleCollect = () => {
    setScore(prev => prev + 1);
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    if (timeLeft <= 0) {
      setGameState('gameOver');
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, timeLeft]);

  // Renderização condicional
  if (gameState === 'home') return <StartScreen onPlay={startGame} />;
  if (gameState === 'gameOver') return <GameOverScreen score={score} onPlayAgain={startGame} />;

  return (
    <View style={styles.gameContainer}>
      <Text style={styles.timerText}>Tempo: {timeLeft}s</Text>
      <Text style={styles.scoreTextGame}>Pontuação: {score}</Text>
      <Text style={styles.instructionsGame}>Colete o orbe azul!</Text>
      
      <OrbFlutuanteGame
        gameActive={gameState === 'playing'}
        onCollect={handleCollect}
        resetTrigger={resetTrigger}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
  },
  scoreTextFinal: {
    fontSize: 24,
    color: '#3498db',
    marginBottom: 40,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  timerText: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 10,
  },
  scoreTextGame: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
    zIndex: 10,
  },
  instructionsGame: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 20,
    color: '#fff',
    zIndex: 10,
  },
});
