import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';

const API_URL = 'http://135.235.193.71:8001';

export default function ChatbotScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<{sender: string, text: string}[]>([]);
  const [mpinSet, setMpinSet] = useState(false);

  const handleSetMpin = async () => {
    try {
      await axios.post(`${API_URL}/chatbot/set-mpin?username=${username}&mpin=${mpin}`);
      setMpinSet(true);
      Alert.alert('Success!', 'MPin set! You can now chat.');
    } catch (error) {
      Alert.alert('Error', 'Could not set MPin.');
    }
  };

  const handleChat = async () => {
    if (!message) return;
    setChat([...chat, { sender: 'You', text: message }]);
    try {
      const response = await axios.post(
        `${API_URL}/chatbot/chat?username=${username}&password=${password}&mpin=${mpin}&message=${message}`
      );
      const reply = response.data.reply.answer || JSON.stringify(response.data.reply);
      setChat(prev => [...prev, { sender: 'AI', text: reply }]);
      setMessage('');
    } catch (error) {
      Alert.alert('Error', 'Chat failed. Check your MPin and credentials.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>StockSphere Chatbot</Text>
      {!mpinSet ? (
        <View>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <TextInput style={styles.input} placeholder="Set 6-digit MPin" value={mpin} onChangeText={setMpin} keyboardType="numeric" maxLength={6} />
          <TouchableOpacity style={styles.button} onPress={handleSetMpin}>
            <Text style={styles.buttonText}>Set MPin & Start Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.chatContainer}>
          <ScrollView style={styles.chatBox}>
            {chat.map((c, i) => (
              <View key={i} style={c.sender === 'You' ? styles.userMsg : styles.aiMsg}>
                <Text style={styles.sender}>{c.sender}</Text>
                <Text style={styles.msgText}>{c.text}</Text>
              </View>
            ))}
          </ScrollView>
          <TextInput style={styles.input} placeholder="Ask about stocks..." value={message} onChangeText={setMessage} />
          <TouchableOpacity style={styles.button} onPress={handleChat}>
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1a1a2e', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  chatContainer: { flex: 1 },
  chatBox: { flex: 1, marginBottom: 10 },
  userMsg: { backgroundColor: '#1a1a2e', padding: 10, borderRadius: 10, marginBottom: 10, alignSelf: 'flex-end', maxWidth: '80%' },
  aiMsg: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 10, marginBottom: 10, alignSelf: 'flex-start', maxWidth: '80%' },
  sender: { fontSize: 12, color: '#999', marginBottom: 4 },
  msgText: { fontSize: 14, color: '#333' },
});