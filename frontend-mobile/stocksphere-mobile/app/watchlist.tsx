import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import axios from 'axios';

const API_URL = 'http://135.235.193.71:8001';

export default function WatchlistScreen() {
  const [stock, setStock] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);

  const handleAdd = async () => {
    try {
      await axios.post(`${API_URL}/watchlist/add?stock_symbol=${stock}`);
      setWatchlist([...watchlist, stock]);
      setStock('');
      Alert.alert('Success!', `${stock} added to watchlist!`);
    } catch (error) {
      Alert.alert('Error', 'Could not add stock.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Watchlist</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter stock symbol e.g. AAPL"
        value={stock}
        onChangeText={setStock}
      />
      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add Stock</Text>
      </TouchableOpacity>
      <FlatList
        data={watchlist}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.stockItem}>
            <Text style={styles.stockText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#1a1a2e' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  button: { backgroundColor: '#1a1a2e', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stockItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  stockText: { fontSize: 16, color: '#333' },
});