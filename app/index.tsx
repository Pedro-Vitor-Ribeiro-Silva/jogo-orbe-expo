import React, { useState, useEffect, FC } from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar, TextInput, FlatList, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SkyJumpGame from '@/components/SkyJumpGame';

// --- TIPOS E CONSTANTES ---

/** Define os nomes das diferentes telas para controlar a navegação. */
type Screen = 'home' | 'playing' | 'postGame' | 'saveScore' | 'finalGameOver' | 'scoreboard';

/** Define a estrutura de um registo de pontuação. */
type ScoreEntry = { id: string; name: string; score: number };

/** Chave usada para guardar e ler os scores no armazenamento local do dispositivo. */
const STORAGE_KEY = '@skyjump_scores';

// --- COMPONENTES DE TELA ---

/** Um container genérico para as telas de menu. */
const ScreenContainer: FC<{children: React.ReactNode}> = ({ children }) => <View style={styles.screenContainer}>{children}</View>;

/** Tela inicial do jogo. */
const StartScreen: FC<{ onPlay: () => void; onShowScores: () => void }> = ({ onPlay, onShowScores }) => (
  <ScreenContainer>
    <Text style={styles.title}>Sky Jump</Text>
    <Text style={styles.instructions}>
      Incline o seu dispositivo para mover. Suba o mais alto que conseguir!
    </Text>
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPlay}>
      <Text style={styles.buttonText}>JOGAR</Text>
    </Pressable>
    <Pressable style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onShowScores}>
      <Text style={styles.buttonText}>PLACAR</Text>
    </Pressable>
  </ScreenContainer>
);

/** Tela que aparece imediatamente após o fim do jogo, perguntando se quer salvar. */
const PostGameScreen: FC<{ score: number; onSave: () => void; onIgnore: () => void }> = ({ score, onSave, onIgnore }) => (
    <ScreenContainer>
        <Text style={styles.title}>Fim de Jogo!</Text>
        <Text style={styles.scoreLabel}>SUA PONTUAÇÃO</Text>
        <Text style={styles.scoreTextFinal}>{score}</Text>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onSave}>
            <Text style={styles.buttonText}>SALVAR PONTUAÇÃO</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onIgnore}>
            <Text style={styles.buttonText}>IGNORAR</Text>
        </Pressable>
    </ScreenContainer>
);

/** Tela para o jogador inserir o nome para salvar a pontuação. */
const SaveScoreScreen: FC<{ score: number; onConfirm: (name: string) => void }> = ({ score, onConfirm }) => {
    const [name, setName] = useState('');
    return (
        <ScreenContainer>
            <Text style={styles.title}>Salvar</Text>
            <Text style={styles.scoreTextFinal}>{score}</Text>
            <TextInput
                style={styles.input}
                placeholder="Digite seu nome..."
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                maxLength={15}
            />
            <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, !name && styles.buttonDisabled]} onPress={() => name && onConfirm(name)} disabled={!name}>
                <Text style={styles.buttonText}>CONFIRMAR</Text>
            </Pressable>
        </ScreenContainer>
    );
};

/** Tela final que oferece as opções de jogar novamente ou voltar ao início. */
const FinalGameOverScreen: FC<{ onPlayAgain: () => void; onGoHome: () => void }> = ({ onPlayAgain, onGoHome }) => (
    <ScreenContainer>
        <Text style={styles.title}>Obrigado por Jogar!</Text>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onPlayAgain}>
            <Text style={styles.buttonText}>JOGAR NOVAMENTE</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onGoHome}>
            <Text style={styles.buttonText}>VOLTAR AO INÍCIO</Text>
        </Pressable>
    </ScreenContainer>
);

/** Tela que exibe a lista de melhores pontuações. */
const ScoreboardScreen: FC<{ scores: ScoreEntry[], onClearOne: (id: string) => void, onClearAll: () => void, onGoHome: () => void }> = ({ scores, onClearOne, onClearAll, onGoHome }) => (
    <ScreenContainer>
        <Text style={styles.title}>Placar</Text>
        <FlatList
            data={scores}
            keyExtractor={(item) => item.id}
            style={styles.scoreList}
            renderItem={({ item, index }) => (
                <View style={styles.scoreEntry}>
                    <Text style={styles.scoreRank}>{index + 1}.</Text>
                    <Text style={styles.scoreName}>{item.name}</Text>
                    <Text style={styles.scoreValue}>{item.score}</Text>
                    <Pressable onPress={() => onClearOne(item.id)}>
                        <Text style={styles.clearButton}>X</Text>
                    </Pressable>
                </View>
            )}
            ListEmptyComponent={<Text style={styles.instructions}>Nenhuma pontuação salva.</Text>}
        />
        <Pressable style={({ pressed }) => [styles.button, styles.dangerButton, pressed && styles.buttonPressed]} onPress={onClearAll}>
            <Text style={styles.buttonText}>LIMPAR TUDO</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.buttonPressed]} onPress={onGoHome}>
            <Text style={styles.buttonText}>VOLTAR</Text>
        </Pressable>
    </ScreenContainer>
);

// --- COMPONENTE PRINCIPAL ---

export default function Index() {
  // --- ESTADOS E REFERÊNCIAS ---
  const [screen, setScreen] = useState<Screen>('home');
  const [finalScore, setFinalScore] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  // --- EFEITOS (HOOKS) ---

  // Carrega as pontuações salvas do AsyncStorage quando o app inicia.
  useEffect(() => {
    const loadScores = async () => {
      try {
        const storedScores = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedScores) {
          setScores(JSON.parse(storedScores));
        }
      } catch (e) {
        console.error("Falha ao carregar pontuações.", e);
      }
    };
    loadScores();
  }, []);

  // --- FUNÇÕES DE LÓGICA ---

  /** Salva a lista de pontuações no AsyncStorage, ordenando e limitando a 10. */
  const saveScores = async (newScores: ScoreEntry[]) => {
    try {
      const sortedScores = newScores.sort((a, b) => b.score - a.score).slice(0, 10);
      setScores(sortedScores);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sortedScores));
    } catch (e) {
      console.error("Falha ao salvar pontuações.", e);
    }
  };

  /** Chamada quando o jogo termina, para guardar o score e mudar de tela. */
  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setScreen('postGame');
  };

  /** Adiciona um novo score à lista e navega para a tela final. */
  const handleSaveScore = (name: string) => {
    const newScore: ScoreEntry = { id: Date.now().toString(), name, score: finalScore };
    saveScores([...scores, newScore]);
    setScreen('finalGameOver');
  };

  /** Remove um score específico do placar. */
  const handleClearOne = (id: string) => {
    Alert.alert("Limpar Pontuação", "Tem a certeza que quer remover esta pontuação?", [
        { text: "Cancelar" },
        { text: "Sim", onPress: () => saveScores(scores.filter(s => s.id !== id)) }
    ]);
  };

  /** Limpa todas as pontuações do placar. */
  const handleClearAll = () => {
    Alert.alert("Limpar Placar", "Tem a certeza que quer remover todas as pontuações?", [
        { text: "Cancelar" },
        { text: "Sim", onPress: () => saveScores([]) }
    ]);
  };
  
  /** Renderiza a tela correta com base no estado 'screen'. */
  const renderScreen = () => {
    switch(screen) {
      case 'playing':
        return <View style={styles.gameContainer}><SkyJumpGame onGameOver={handleGameOver} /></View>;
      case 'postGame':
        return <PostGameScreen score={finalScore} onSave={() => setScreen('saveScore')} onIgnore={() => setScreen('finalGameOver')} />;
      case 'saveScore':
        return <SaveScoreScreen score={finalScore} onConfirm={handleSaveScore} />;
      case 'finalGameOver':
          return <FinalGameOverScreen onPlayAgain={() => setScreen('playing')} onGoHome={() => setScreen('home')} />;
      case 'scoreboard':
        return <ScoreboardScreen scores={scores} onClearOne={handleClearOne} onClearAll={handleClearAll} onGoHome={() => setScreen('home')} />;
      case 'home':
      default:
        return <StartScreen onPlay={() => setScreen('playing')} onShowScores={() => setScreen('scoreboard')} />;
    }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <>
      <StatusBar barStyle="light-content" />
      {renderScreen()}
    </>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  screenContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2340', padding: 20 },
  gameContainer: { flex: 1 },
  title: { fontSize: 52, fontWeight: 'bold', color: '#fff', marginBottom: 20, textShadowColor: 'rgba(0, 0, 0, 0.25)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
  instructions: { fontSize: 18, color: '#AEB8D1', textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  scoreLabel: { fontSize: 18, color: '#AEB8D1', marginBottom: 10 },
  scoreTextFinal: { fontSize: 64, color: '#fff', fontWeight: 'bold', marginBottom: 40, textShadowColor: 'rgba(255, 255, 255, 0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 15 },
  button: { backgroundColor: '#4A90E2', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.30, shadowRadius: 4.65, elevation: 8, marginVertical: 10, minWidth: 250, alignItems: 'center' },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#7788A8' },
  dangerButton: { backgroundColor: '#e74c3c' },
  buttonDisabled: { backgroundColor: '#555' },
  input: { height: 50, width: '80%', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 15, fontSize: 18, color: '#333', marginBottom: 20 },
  scoreList: { width: '100%', maxHeight: '60%' },
  scoreEntry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#33415C' },
  scoreRank: { color: '#AEB8D1', fontSize: 18, width: '15%' },
  scoreName: { color: '#fff', fontSize: 18, fontWeight: 'bold', width: '50%' },
  scoreValue: { color: '#4A90E2', fontSize: 18, fontWeight: 'bold', width: '25%', textAlign: 'right' },
  clearButton: { color: '#e74c3c', fontSize: 20, fontWeight: 'bold', marginLeft: 10 }
});