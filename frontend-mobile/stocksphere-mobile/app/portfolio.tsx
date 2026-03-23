import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import axios from 'axios';

const API_URL = 'http://135.235.193.71:8001';

export default function PortfolioScreen() {
  const [portfolio, setPortfolio] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/data/portfolio?username=${username}&password=${password}`
      );
      setPortfolio(response.data);
      setLoggedIn(true);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch portfolio. Check credentials.');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My Portfolio</Text>
      {!loggedIn ? (
        <View>
          <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <TouchableOpacity style={styles.button} onPress={fetchPortfolio}>
            <Text style={styles.buttonText}>{loading ? 'Loading...' : 'View Portfolio'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {portfolio.length === 0 ? (
            <Text style={styles.empty}>No portfolio data found.</Text>
          ) : (
            portfolio.map((item: any, index: number) => (
              <View key={index} style={styles.stockCard}>
                <Text style={styles.symbol}>{item.symbol || item.name}</Text>
                <Text style={styles.value}>{JSON.stringify(item)}</Text>
              </View>
            ))
          )}
          <TouchableOpacity style={[styles.button, {marginTop: 20}]} onPress={() => setLoggedIn(false)}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stockCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  symbol: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  value: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', fontSize: 16, color: '#666', marginTop: 50 },
});